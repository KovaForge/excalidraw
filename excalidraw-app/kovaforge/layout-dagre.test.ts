import dagre from "@dagrejs/dagre";

import { dagreLayout, nodeSize, wrapLabel } from "./layout-dagre";
import {
  backEdges,
  big,
  branching,
  leftToRight,
  linear,
  loop,
} from "./fixtures";

import type { Rect } from "./engine";

describe("dagre coordinate convention", () => {
  it("reports node x and y as CENTRES, not top-left corners", () => {
    // Finding: with a 100 x 40 node and marginx/marginy 40, a corner convention would give x = 40, y = 40;
    // dagre gives x = 90, y = 60 (40 + half the size), so x and y are centres. layout-dagre.ts converts to top-left.
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "TB",
      nodesep: 50,
      ranksep: 70,
      marginx: 40,
      marginy: 40,
    });
    g.setDefaultEdgeLabel(() => ({}));
    g.setNode("a", { width: 100, height: 40 });
    g.setNode("b", { width: 100, height: 40 });
    g.setEdge("a", "b");
    dagre.layout(g);
    expect(g.node("a").x).toBe(90);
    expect(g.node("a").y).toBe(60);
    expect(g.node("b").x).toBe(90);
    expect(g.node("b").y).toBeGreaterThan(g.node("a").y + 40);
  });

  it("our layout returns top-left Rects starting at the margin", () => {
    const { nodes } = dagreLayout.layout(linear);
    const minX = Math.min(...Object.values(nodes).map((r) => r.x));
    const minY = Math.min(...Object.values(nodes).map((r) => r.y));
    expect(minX).toBe(40);
    expect(minY).toBe(40);
  });
});

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

const fixtures = { linear, branching, loop, leftToRight, big: big() };

describe.each(Object.entries(fixtures))("layout of %s", (_name, diagram) => {
  const positioned = dagreLayout.layout(diagram);

  it("gives every node a Rect of positive size", () => {
    expect(Object.keys(positioned.nodes).sort()).toEqual(
      diagram.nodes.map((node) => node.id).sort(),
    );
    for (const rect of Object.values(positioned.nodes)) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(Number.isFinite(rect.x + rect.y)).toBe(true);
    }
  });

  it("has no overlapping Rects", () => {
    const rects = Object.entries(positioned.nodes);
    const clashes: string[] = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (overlaps(rects[i][1], rects[j][1])) {
          clashes.push(`${rects[i][0]} overlaps ${rects[j][0]}`);
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it("returns one routed edge per diagram edge, in order", () => {
    expect(positioned.edges.map((e) => [e.from, e.to])).toEqual(
      diagram.edges.map((e) => [e.from, e.to]),
    );
    for (const edge of positioned.edges) {
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("is deterministic and does not touch its input", () => {
    const before = JSON.stringify(diagram);
    expect(JSON.stringify(dagreLayout.layout(diagram))).toBe(
      JSON.stringify(positioned),
    );
    expect(JSON.stringify(diagram)).toBe(before);
  });

  it("puts each successor after its predecessor in the flow direction", () => {
    for (const edge of diagram.edges) {
      if (backEdges.has(`${edge.from}->${edge.to}`)) {
        continue;
      }
      const from = positioned.nodes[edge.from];
      const to = positioned.nodes[edge.to];
      if (diagram.direction === "TB") {
        expect(to.y).toBeGreaterThanOrEqual(from.y + from.height);
      } else {
        expect(to.x).toBeGreaterThanOrEqual(from.x + from.width);
      }
    }
  });
});

describe("big diagram", () => {
  it("has 40 nodes and lays out in well under a second", () => {
    const diagram = big();
    expect(diagram.nodes).toHaveLength(40);
    const started = performance.now();
    dagreLayout.layout(diagram);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe("node sizing", () => {
  it("wraps on word boundaries at about 24 characters", () => {
    expect(wrapLabel("Is the amount over 1000 dollars?")).toEqual([
      "Is the amount over 1000",
      "dollars?",
    ]);
    expect(wrapLabel("Short")).toEqual(["Short"]);
  });

  it("respects the minimum, the maximum and the decision factors", () => {
    expect(nodeSize({ id: "a", label: "Hi", kind: "step" })).toEqual({
      width: 120,
      height: 56,
    });
    const long = nodeSize({
      id: "a",
      label: "word ".repeat(30).trim(),
      kind: "step",
    });
    expect(long.width).toBe(260);
    const decision = nodeSize({ id: "a", label: "Hi", kind: "decision" });
    expect(decision).toEqual({ width: 192, height: 101 });
    const start = nodeSize({ id: "a", label: "Hi", kind: "start" });
    expect(start.width).toBeLessThanOrEqual(120);
    expect(start.height).toBeGreaterThanOrEqual(48);
  });
});
