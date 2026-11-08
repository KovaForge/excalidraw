import { vi } from "vitest";

import { dagreLayout } from "./layout-dagre";
import { excalidrawEngine } from "./engine-excalidraw";
import { branching, leftToRight, linear, loop } from "./fixtures";

import type { Diagram } from "./diagram";

type El = {
  id: string;
  type: string;
  isDeleted?: boolean;
  containerId?: string | null;
  text: string;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
  boundElements?: { id: string; type: string }[] | null;
  roundness?: unknown;
  backgroundColor?: string;
  endArrowhead?: string | null;
};

const sceneOf = (diagram: Diagram) =>
  excalidrawEngine.toScene(dagreLayout.layout(diagram));
const elementsOf = (diagram: Diagram) =>
  (sceneOf(diagram).data as { elements: El[] }).elements;

describe.each([
  ["linear", linear],
  ["branching", branching],
  ["loop", loop],
  ["left to right", leftToRight],
])("Excalidraw scene for %s", (_name, diagram) => {
  const scene = sceneOf(diagram);
  const elements = (scene.data as { elements: El[] }).elements;
  const arrows = elements.filter((e) => e.type === "arrow");
  const ids = new Set(elements.map((e) => e.id));

  it("names the engine and version, and round-trips through JSON", () => {
    expect(scene.engine).toBe("excalidraw");
    expect(scene.version).toBe(excalidrawEngine.version);
    expect(scene.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
    expect((scene.data as any).appState).toEqual({
      viewBackgroundColor: "#ffffff",
    });
  });

  it("draws one shape of the right type per node", () => {
    for (const node of diagram.nodes) {
      const shape = elements.find((e) => e.id === node.id)!;
      expect(shape.type).toBe(
        node.kind === "decision" ? "diamond" : "rectangle",
      );
      const label = elements.find((e) => e.containerId === node.id);
      expect(label?.text.replace(/\s+/g, " ")).toBe(node.label);
      if (node.kind === "start" || node.kind === "end") {
        expect(shape.roundness).toBeTruthy();
      }
      if (node.kind === "step") {
        expect(shape.roundness).toBeFalsy();
        expect(shape.backgroundColor).toBe("transparent");
      }
    }
    const shapes = elements.filter(
      (e) => e.type === "rectangle" || e.type === "diamond",
    );
    expect(shapes).toHaveLength(diagram.nodes.length);
  });

  it("draws one arrow per edge, bound to existing elements, with labels and arrowheads", () => {
    expect(arrows).toHaveLength(diagram.edges.length);
    arrows.forEach((arrow, index) => {
      const edge = diagram.edges[index];
      expect(arrow.startBinding?.elementId).toBe(edge.from);
      expect(arrow.endBinding?.elementId).toBe(edge.to);
      expect(ids.has(arrow.startBinding!.elementId)).toBe(true);
      expect(ids.has(arrow.endBinding!.elementId)).toBe(true);
      expect(arrow.endArrowhead).toBe("arrow");
      const label = elements.find((e) => e.containerId === arrow.id);
      expect(label?.text.replace(/\s+/g, " ")).toBe(edge.label);
    });
  });
});

describe("Excalidraw scene colours", () => {
  it("uses soft green for start and end and soft amber for decisions", () => {
    const els = elementsOf(branching);
    expect(els.find((e) => e.id === "start")!.backgroundColor).toBe("#d3f9d8");
    expect(els.find((e) => e.id === "check")!.backgroundColor).toBe("#ffec99");
  });
});

describe("Excalidraw exports", () => {
  it("rejects a scene made by another engine", async () => {
    const scene = { engine: "other", version: "1", data: {} };
    await expect(excalidrawEngine.exportSvg(scene)).rejects.toThrow(/other/);
  });

  it("exportSvg builds a self-contained SVG string", async () => {
    // Real call under jsdom; see the mocked test below if this environment cannot run it.
    const svg = await excalidrawEngine.exportSvg(sceneOf(branching));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("xmlns=");
    expect(svg).toContain("Manager approves");
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});

describe("Excalidraw PNG export", () => {
  it("exportPng returns a PNG blob (canvas is mocked by vitest-canvas-mock, so pixels are not checked)", async () => {
    const png = await excalidrawEngine.exportPng(sceneOf(linear));
    expect(png).toBeInstanceOf(Blob);
    expect(png.type).toBe("image/png");
  });
});

describe("Excalidraw export arguments (Excalidraw call mocked)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@excalidraw/excalidraw");
  });

  it("asks for an SVG with background and padding 24, and a 2x PNG", async () => {
    const exportScene = vi.fn(async (opts: { type: string }) =>
      opts.type === "svg"
        ? document.createElementNS("http://www.w3.org/2000/svg", "svg")
        : new Blob(["png"], { type: "image/png" }),
    );
    vi.resetModules();
    vi.doMock("@excalidraw/excalidraw", async (importOriginal) => ({
      ...(await importOriginal<object>()),
      exportScene,
    }));
    const { excalidrawEngine: engine } = await import("./engine-excalidraw");
    const scene = engine.toScene(dagreLayout.layout(linear));

    const svg = await engine.exportSvg(scene);
    expect(svg).toContain("<svg");
    const png = await engine.exportPng(scene);
    expect(png.type).toBe("image/png");

    const [svgCall, pngCall] = exportScene.mock.calls.map((c) => c[0] as any);
    expect(svgCall.type).toBe("svg");
    expect(svgCall.config).toEqual({
      canvasBackgroundColor: "#ffffff",
      padding: 24,
    });
    expect(svgCall.config.skipInliningFonts).toBeUndefined();
    expect(pngCall.type).toBe("png");
    expect(pngCall.config).toEqual({
      canvasBackgroundColor: "#ffffff",
      padding: 24,
      scale: 2,
    });
    expect(svgCall.data.appState.viewBackgroundColor).toBe("#ffffff");
    expect(svgCall.data.elements.length).toBeGreaterThan(0);
  });
});
