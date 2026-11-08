// LayoutEngine backed by @dagrejs/dagre. Pure and deterministic: the same diagram always gives the same positions.

import dagre from "@dagrejs/dagre";

import type { Diagram } from "./diagram";
import type { LayoutEngine, PositionedDiagram, Rect } from "./engine";

const WRAP_CHARS = 24;
const CHAR_WIDTH = 9; // about 9 px per character at a 16 px font
const PADDING_X = 24;
const PADDING_Y = 16;
const LINE_HEIGHT = 24;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 48;
const MAX_WIDTH = 260;
const TERMINAL_MIN_WIDTH = 100; // start and end nodes may be a little narrower
const TERMINAL_WIDTH_FACTOR = 0.85;
const DECISION_WIDTH_FACTOR = 1.6; // a diamond only shows about half its box to the text
const DECISION_HEIGHT_FACTOR = 1.8;

/** Wrap on word boundaries at about WRAP_CHARS characters; a word longer than that stays on its own line. */
export function wrapLabel(label: string): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of label.split(/\s+/).filter(Boolean)) {
    if (current && current.length + 1 + word.length > WRAP_CHARS) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length ? lines : [""];
}

export function nodeSize(node: Diagram["nodes"][number]) {
  const lines = wrapLabel(node.label);
  const longest = Math.max(...lines.map((line) => line.length));
  let width = Math.min(
    MAX_WIDTH,
    Math.max(MIN_WIDTH, longest * CHAR_WIDTH + 2 * PADDING_X),
  );
  const height = Math.max(
    MIN_HEIGHT,
    lines.length * LINE_HEIGHT + 2 * PADDING_Y,
  );
  if (node.kind === "decision") {
    return {
      width: Math.round(width * DECISION_WIDTH_FACTOR),
      height: Math.round(height * DECISION_HEIGHT_FACTOR),
    };
  }
  if (node.kind === "start" || node.kind === "end") {
    width = Math.max(
      TERMINAL_MIN_WIDTH,
      Math.round(width * TERMINAL_WIDTH_FACTOR),
    );
  }
  return { width, height };
}

export const dagreLayout: LayoutEngine = {
  id: "dagre",
  layout(diagram: Diagram): PositionedDiagram {
    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setGraph({
      rankdir: diagram.direction,
      nodesep: 50,
      ranksep: 70,
      marginx: 40,
      marginy: 40,
    });
    g.setDefaultEdgeLabel(() => ({}));
    for (const node of diagram.nodes) {
      g.setNode(node.id, nodeSize(node));
    }
    diagram.edges.forEach((edge, index) => {
      g.setEdge(edge.from, edge.to, {}, String(index));
    });
    dagre.layout(g);

    // Finding (see the test): dagre's node x and y are the node CENTRES, so the top-left corner is x - width / 2, y - height / 2.
    const nodes: Record<string, Rect> = {};
    for (const node of diagram.nodes) {
      const n = g.node(node.id);
      nodes[node.id] = {
        x: n.x! - n.width / 2,
        y: n.y! - n.height / 2,
        width: n.width,
        height: n.height,
      };
    }
    const centre = (id: string) => ({
      x: nodes[id].x + nodes[id].width / 2,
      y: nodes[id].y + nodes[id].height / 2,
    });
    const edges = diagram.edges.map((edge, index) => {
      const routed = g.edge(edge.from, edge.to, String(index))?.points;
      return {
        from: edge.from,
        to: edge.to,
        ...(edge.label ? { label: edge.label } : {}),
        points: routed?.length
          ? routed.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }))
          : [centre(edge.from), centre(edge.to)],
      };
    });
    return { diagram, nodes, edges };
  },
};
