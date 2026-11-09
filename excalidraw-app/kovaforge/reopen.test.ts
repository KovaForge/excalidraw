import { chooseReopen, versionsCompatible } from "./reopen";
import { branching } from "./fixtures";

const cur = { id: "excalidraw", version: "0.18.0" };

describe("chooseReopen", () => {
  it("opens the scene for the same engine and compatible version", () => {
    expect(
      chooseReopen(
        { engine: { id: "excalidraw", version: "0.18.0" }, diagram: null },
        cur,
      ),
    ).toBe("scene");
    expect(
      chooseReopen(
        { engine: { id: "excalidraw", version: "0.18.3" }, diagram: branching },
        cur,
      ),
    ).toBe("scene");
  });

  it("lays the diagram out again when the engine or version differs", () => {
    expect(
      chooseReopen(
        { engine: { id: "tldraw", version: "1.0.0" }, diagram: branching },
        cur,
      ),
    ).toBe("layout");
    expect(
      chooseReopen(
        { engine: { id: "excalidraw", version: "0.19.0" }, diagram: branching },
        cur,
      ),
    ).toBe("layout");
  });

  it("is unavailable when nothing can rebuild it", () => {
    expect(
      chooseReopen(
        { engine: { id: "tldraw", version: "1.0.0" }, diagram: null },
        cur,
      ),
    ).toBe("unavailable");
    expect(
      chooseReopen(
        { engine: { id: "excalidraw", version: "0.19.0" }, diagram: null },
        cur,
      ),
    ).toBe("unavailable");
  });

  it("compatibility: same major (same major and minor before 1.0), or identical strings", () => {
    expect(versionsCompatible("2.1.0", "2.9.9")).toBe(true);
    expect(versionsCompatible("2.1.0", "3.0.0")).toBe(false);
    expect(versionsCompatible("0.18.0", "0.18.5")).toBe(true);
    expect(versionsCompatible("0.18.0", "0.19.0")).toBe(false);
    expect(versionsCompatible("weird", "weird")).toBe(true);
    expect(versionsCompatible("weird", "other")).toBe(false);
  });
});
