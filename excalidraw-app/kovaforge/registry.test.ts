import { dagreLayout } from "./layout-dagre";
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
    expect(getLayout("dagre")).toBe(dagreLayout);
    expect(getLayout()).toBe(dagreLayout);
  });

  it("throws a clear error on an unknown id", () => {
    expect(() => getEngine("tldraw")).toThrow(
      'Unknown diagram engine "tldraw". Registered: none.',
    );
    expect(() => getLayout("elk")).toThrow(
      'Unknown layout "elk". Registered: dagre.',
    );
  });

  it("lets another adapter register by id", () => {
    registerLayout({ id: "mine", layout: dagreLayout.layout });
    expect(getLayout("mine").id).toBe("mine");
    const stub = {
      id: "other",
      version: "1",
      toScene: () => ({ engine: "other", version: "1", data: null }),
      exportSvg: async () => "",
      exportPng: async () => new Blob(),
    };
    registerEngine(stub);
    expect(getEngine("other")).toBe(stub);
  });
});
