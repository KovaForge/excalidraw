// Registry of layout and drawing engines by id. Importing this file registers nothing: call registerDefaults() from app code.

import { excalidrawEngine } from "./engine-excalidraw";
import { dagreLayout } from "./layout-dagre";

import type { DiagramEngine, LayoutEngine } from "./engine";

export const DEFAULT_ENGINE_ID = "excalidraw";
export const DEFAULT_LAYOUT_ID = "dagre";

const engines = new Map<string, DiagramEngine>();
const layouts = new Map<string, LayoutEngine>();

export function registerEngine(engine: DiagramEngine) {
  engines.set(engine.id, engine);
}

export function registerLayout(layout: LayoutEngine) {
  layouts.set(layout.id, layout);
}

export function getEngine(id: string = DEFAULT_ENGINE_ID): DiagramEngine {
  const engine = engines.get(id);
  if (!engine) {
    throw new Error(
      `Unknown diagram engine "${id}". Registered: ${
        [...engines.keys()].join(", ") || "none"
      }.`,
    );
  }
  return engine;
}

export function getLayout(id: string = DEFAULT_LAYOUT_ID): LayoutEngine {
  const layout = layouts.get(id);
  if (!layout) {
    throw new Error(
      `Unknown layout "${id}". Registered: ${
        [...layouts.keys()].join(", ") || "none"
      }.`,
    );
  }
  return layout;
}

export function registerDefaults() {
  registerEngine(excalidrawEngine);
  registerLayout(dagreLayout);
}
