import { dagreLayout } from "./layout-dagre";
import { excalidrawEngine } from "./engine-excalidraw";
import {
  getEngine,
  getLayout,
  registerDefaults,
  registerEngine,
  registerLayout,
} from "./registry";

describe("registry", () => {
  it("registers nothing until registerDefaults() is called", () => {
    // Importing the module must have no side effects: lookups fail before registerDefaults().
    // (This file is the only one that touches the registry, and it runs first.)
    expect(() => getEngine("excalidraw")).toThrow(/Unknown diagram engine/);
    expect(() => getLayout("dagre")).toThrow(/Unknown layout/);
  });

  it("returns the defaults after registerDefaults()", () => {
    registerDefaults();
    expect(getEngine("excalidraw")).toBe(excalidrawEngine);
    expect(getLayout("dagre")).toBe(dagreLayout);
    expect(getEngine()).toBe(excalidrawEngine);
    expect(getLayout()).toBe(dagreLayout);
  });

  it("throws a clear error on an unknown id", () => {
    expect(() => getEngine("tldraw")).toThrow(
      'Unknown diagram engine "tldraw". Registered: excalidraw.',
    );
    expect(() => getLayout("elk")).toThrow(
      'Unknown layout "elk". Registered: dagre.',
    );
  });

  it("lets another adapter register by id", () => {
    registerLayout({ id: "mine", layout: dagreLayout.layout });
    expect(getLayout("mine").id).toBe("mine");
    registerEngine({ ...excalidrawEngine, id: "other" });
    expect(getEngine("other").id).toBe("other");
  });
});
