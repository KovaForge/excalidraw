import { openShare } from "./openShare";
import { getCurrentDiagram, setCurrentDiagram } from "./currentDiagram";
import { branching } from "./fixtures";
import { registerDefaults } from "./registry";
import { loadScene } from "./session";
import { stashCurrentDrawing } from "./stash";

const order: string[] = [];
vi.mock("./session", () => ({ loadScene: vi.fn(() => order.push("load")) }));
vi.mock("./stash", () => ({
  stashCurrentDrawing: vi.fn(() => order.push("stash")),
}));

const scene = {
  engine: "excalidraw",
  version: "0.18.0",
  data: { elements: [{ id: "a" }] },
};

describe("openShare", () => {
  beforeEach(() => {
    registerDefaults();
    order.length = 0;
    setCurrentDiagram(null);
    (loadScene as any).mockClear();
    (stashCurrentDrawing as any).mockClear();
  });

  it("stashes, then loads the saved scene, and sets the diagram only when there is one", () => {
    expect(
      openShare({
        title: "T",
        engine: { id: "excalidraw", version: "0.18.0" },
        diagram: null,
        scene,
      }),
    ).toEqual({ ok: true });
    expect(order).toEqual(["stash", "load"]);
    expect((loadScene as any).mock.calls[0][0]).toBe(scene);
    expect(getCurrentDiagram()).toBeNull();
    openShare({
      title: "T",
      engine: { id: "excalidraw", version: "0.18.0" },
      diagram: branching,
      scene,
    });
    expect(getCurrentDiagram()).toBe(branching);
  });

  it("lays the diagram out when the engine differs", () => {
    openShare({
      title: "T",
      engine: { id: "other", version: "1.0.0" },
      diagram: branching,
      scene: { engine: "other", version: "1.0.0", data: {} },
    });
    const loaded = (loadScene as any).mock.calls[0][0];
    expect(loaded.engine).toBe("excalidraw");
    expect(loaded.data.elements.length).toBeGreaterThan(0);
  });

  it("refuses and touches nothing when it cannot be reopened", () => {
    const r = openShare({
      title: "T",
      engine: { id: "other", version: "1.0.0" },
      diagram: null,
      scene: { engine: "other", version: "1.0.0", data: {} },
    });
    expect(r).toEqual({
      ok: false,
      message:
        "This diagram was made with a different editor and cannot be reopened here. Its picture is still shared.",
    });
    expect(stashCurrentDrawing).not.toHaveBeenCalled();
    expect(loadScene).not.toHaveBeenCalled();
  });
});
