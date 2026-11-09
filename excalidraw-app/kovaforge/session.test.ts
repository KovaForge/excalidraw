import { describe, expect, it, vi } from "vitest";

import { registerDefaults } from "./registry";
import {
  attach,
  getScene,
  loadScene,
  FIT_BOTTOM_PX,
  FIT_TOP_PX,
} from "./session";

const makeApi = () =>
  ({
    updateScene: vi.fn(),
    getSceneElements: vi.fn(() => [{ id: "a" }]),
    getAppState: vi.fn(() => ({ width: 1280, height: 713 })),
    setViewport: vi.fn(),
  } as any);

const scene = { data: { elements: [{ id: "a" }] } } as any;

describe("session fit", () => {
  it("fits the draft with toolbar, banner and side margins", () => {
    const api = makeApi();
    attach(api);
    loadScene(scene);
    expect(api.setViewport).toHaveBeenCalledWith({
      target: [{ id: "a" }],
      fit: "scale-down",
      animation: false,
      offsets: {
        top: FIT_TOP_PX,
        bottom: FIT_BOTTOM_PX,
        left: 128,
        right: 128,
      },
    });
    expect(FIT_TOP_PX).toBe(100);
    expect(FIT_BOTTOM_PX).toBe(140);
    attach(null);
  });

  it("never zooms in past 100 percent (scale-down, no contain)", () => {
    const api = makeApi();
    attach(api);
    loadScene(scene);
    expect(api.setViewport.mock.calls[0][0].fit).toBe("scale-down");
    attach(null);
  });
});

describe("session getScene", () => {
  it("returns null with no editor or an empty drawing", () => {
    attach(null);
    expect(getScene()).toBeNull();
    attach({
      getSceneElements: () => [{ id: "a", isDeleted: true }],
      getAppState: () => ({}),
    } as any);
    expect(getScene()).toBeNull();
    attach(null);
  });

  it("returns live elements and the background as an engine scene", () => {
    registerDefaults();
    attach({
      getSceneElements: () => [
        { id: "a", isDeleted: false },
        { id: "b", isDeleted: true },
      ],
      getAppState: () => ({ viewBackgroundColor: "#eeeeee", width: 5 }),
    } as any);
    const scene = getScene()!;
    expect(scene.engine).toBe("excalidraw");
    expect(scene.version).toBe("0.18.0");
    expect(scene.data).toEqual({
      elements: [{ id: "a", isDeleted: false }],
      appState: { viewBackgroundColor: "#eeeeee" },
    });
    attach(null);
  });
});
