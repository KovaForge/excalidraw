// DiagramEngine for Excalidraw (our fork, in this repo). The only file in kovaforge/ that knows about Excalidraw.

import {
  convertToExcalidrawElements,
  exportScene,
} from "@excalidraw/excalidraw";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { LocalPoint } from "@excalidraw/math";

import excalidrawPackage from "../../packages/excalidraw/package.json";

import type {
  DiagramEngine,
  EngineScene,
  PositionedDiagram,
  Rect,
} from "./engine";

const LABEL_FONT_SIZE = 16; // matches the 16 px font the layout's node sizing assumes
const BACKGROUND = "#ffffff";
const SOFT_GREEN = { backgroundColor: "#d3f9d8", strokeColor: "#2f9e44" };
const SOFT_AMBER = { backgroundColor: "#ffec99", strokeColor: "#f08c00" };

type SceneData = {
  elements: unknown[];
  appState: { viewBackgroundColor: string };
};

const BEND_TOLERANCE = 8;

const centre = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

function distanceFromLine(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return (
    Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / length
  );
}

function toSkeletons(positioned: PositionedDiagram) {
  const skeletons: ExcalidrawElementSkeleton[] = [];
  for (const node of positioned.diagram.nodes) {
    const rect = positioned.nodes[node.id];
    const base = {
      id: node.id,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      label: { text: node.label, fontSize: LABEL_FONT_SIZE },
    };
    if (node.kind === "decision") {
      skeletons.push({ ...base, type: "diamond", ...SOFT_AMBER });
    } else if (node.kind === "start" || node.kind === "end") {
      skeletons.push({
        ...base,
        type: "rectangle",
        roundness: { type: 3 },
        ...SOFT_GREEN,
      });
    } else {
      skeletons.push({ ...base, type: "rectangle" });
    }
  }
  positioned.edges.forEach((edge, index) => {
    const from = centre(positioned.nodes[edge.from]);
    const to = centre(positioned.nodes[edge.to]);
    const bends = edge.points.slice(1, -1).filter(
      // keep a route point only when it bends the arrow away from the straight centre-to-centre line
      (p) => distanceFromLine(p, from, to) > BEND_TOLERANCE,
    );
    // Points are given explicitly: without them the converter treats a zero width or height as "use 100".
    const points = [from, ...bends, to].map((p) => [
      p.x - from.x,
      p.y - from.y,
    ]) as unknown as LocalPoint[];
    skeletons.push({
      type: "arrow",
      id: `edge-${index}`,
      x: from.x,
      y: from.y,
      points,
      endArrowhead: "arrow",
      start: { id: edge.from },
      end: { id: edge.to },
      ...(edge.label
        ? { label: { text: edge.label, fontSize: LABEL_FONT_SIZE } }
        : {}),
    });
  });
  return skeletons;
}

function sceneData(scene: EngineScene) {
  if (scene.engine !== "excalidraw") {
    throw new Error(
      `The Excalidraw engine cannot draw a scene made by "${scene.engine}".`,
    );
  }
  const data = scene.data as SceneData;
  return {
    elements: data.elements as Parameters<
      typeof exportScene
    >[0]["data"]["elements"],
    appState: {
      viewBackgroundColor: data.appState?.viewBackgroundColor ?? BACKGROUND,
    },
  } as Parameters<typeof exportScene>[0]["data"];
}

/** Export options shared by the SVG and PNG exports. */
export const EXPORT_PADDING = 24;
export const PNG_SCALE = 2;

export const excalidrawEngine: DiagramEngine = {
  id: "excalidraw",
  version: excalidrawPackage.version,

  toScene(positioned) {
    // regenerateIds false keeps our ids, so the arrow bindings stay readable and stable.
    const elements = convertToExcalidrawElements(toSkeletons(positioned), {
      regenerateIds: false,
    });
    const data: SceneData = {
      elements,
      appState: { viewBackgroundColor: BACKGROUND },
    };
    return {
      engine: "excalidraw",
      version: excalidrawPackage.version,
      data: JSON.parse(JSON.stringify(data)),
    };
  },

  async exportSvg(scene) {
    // Fonts are embedded in the SVG as data: URLs (fetched from this app's own origin), so the picture needs no fonts from anywhere else.
    const svg = await exportScene({
      type: "svg",
      data: sceneData(scene),
      config: { canvasBackgroundColor: BACKGROUND, padding: EXPORT_PADDING },
    });
    return new XMLSerializer().serializeToString(svg);
  },

  exportPng(scene) {
    return exportScene({
      type: "png",
      data: sceneData(scene),
      config: {
        canvasBackgroundColor: BACKGROUND,
        padding: EXPORT_PADDING,
        scale: PNG_SCALE,
      },
    });
  },
};
