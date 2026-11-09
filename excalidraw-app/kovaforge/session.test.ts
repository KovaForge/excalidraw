import { describe, expect, it, vi } from "vitest";

import { attach, loadScene, FIT_BOTTOM_PX, FIT_TOP_PX } from "./session";

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
