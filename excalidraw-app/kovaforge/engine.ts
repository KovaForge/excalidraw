// KovaForge engine-neutral interfaces. Nothing in this file may import Excalidraw, dagre or any other drawing or layout library.
// A layout algorithm implements LayoutEngine; a drawing engine implements DiagramEngine. Both are registered by id (see registry.ts).

import type { Diagram } from "./diagram";

/** A rectangle in scene units. x and y are the TOP-LEFT corner (not the centre). */
export type Rect = { x: number; y: number; width: number; height: number };

/** A neutral diagram plus where everything goes. */
export type PositionedDiagram = {
  diagram: Diagram;
  /** One Rect per node id in diagram.nodes. */
  nodes: Record<string, Rect>;
  /** One entry per diagram edge, in the same order. points are optional route hints (centre-to-centre is fine). */
  edges: {
    from: string;
    to: string;
    label?: string;
    points: { x: number; y: number }[];
  }[];
};

/**
 * Layout adapter. layout() must give every node a Rect with positive size, no two Rects overlapping, and the same
 * output for the same input. It must not mutate the diagram it is given.
 */
export interface LayoutEngine {
  readonly id: string;
  layout(diagram: Diagram): PositionedDiagram;
}

/** What an engine saves for later editing. data must survive JSON.parse(JSON.stringify(data)) unchanged. */
export type EngineScene = { engine: string; version: string; data: unknown };

/**
 * Drawing-engine adapter. toScene() draws a positioned diagram as that engine's own scene (set engine to this id and
 * version to this version). exportSvg() and exportPng() render a scene this engine made, and must not load anything
 * from other sites. The exports may need a browser.
 */
export interface DiagramEngine {
  readonly id: string;
  readonly version: string;
  toScene(positioned: PositionedDiagram): EngineScene;
  exportSvg(scene: EngineScene): Promise<string>;
  exportPng(scene: EngineScene): Promise<Blob>;
}
