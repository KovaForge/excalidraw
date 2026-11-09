import {
  applyPendingRestore,
  hasSavedDrawing,
  hasStash,
  requestRestore,
  stashCurrentDrawing,
} from "./stash";

const three = JSON.stringify([{ id: "a" }, { id: "b" }, { id: "c" }]);

describe("stash", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("does not stash an empty drawing or replace a stash with it", () => {
    localStorage.setItem("excalidraw", "[]");
    expect(hasSavedDrawing()).toBe(false);
    stashCurrentDrawing();
    expect(hasStash()).toBe(false);
    localStorage.setItem("kovaforge:previous:elements", three);
    stashCurrentDrawing();
    expect(localStorage.getItem("kovaforge:previous:elements")).toBe(three);
  });

  it("stashes elements and state, replacing an older stash", () => {
    localStorage.setItem("kovaforge:previous:elements", '[{"id":"old"}]');
    localStorage.setItem("excalidraw", three);
    localStorage.setItem("excalidraw-state", '{"x":1}');
    expect(hasSavedDrawing()).toBe(true);
    stashCurrentDrawing();
    expect(localStorage.getItem("kovaforge:previous:elements")).toBe(three);
    expect(localStorage.getItem("kovaforge:previous:state")).toBe('{"x":1}');
    expect(hasStash()).toBe(true);
  });

  it("restores via the flag", () => {
    localStorage.setItem("kovaforge:previous:elements", three);
    localStorage.setItem("kovaforge:previous:state", '{"x":1}');
    localStorage.setItem("excalidraw", '[{"id":"new"}]');
    applyPendingRestore(); // no flag: nothing happens
    expect(localStorage.getItem("excalidraw")).toBe('[{"id":"new"}]');
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    requestRestore();
    expect(sessionStorage.getItem("kovaforge:restore")).toBe("1");
    expect(reload).toHaveBeenCalled();
    applyPendingRestore();
    expect(localStorage.getItem("excalidraw")).toBe(three);
    expect(localStorage.getItem("excalidraw-state")).toBe('{"x":1}');
    expect(sessionStorage.getItem("kovaforge:restore")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("does nothing when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(hasSavedDrawing()).toBe(false);
    expect(hasStash()).toBe(false);
    expect(() => stashCurrentDrawing()).not.toThrow();
    expect(() => applyPendingRestore()).not.toThrow();
  });
});
