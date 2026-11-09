import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { KovaForgeRoot } from "./KovaForgeRoot";
import { branching } from "./fixtures";

import { generateDiagram } from "./api";
import { loadScene } from "./session";
import { stashCurrentDrawing } from "./stash";

vi.mock("../App", () => ({ default: () => <div>EDITOR</div> }));
vi.mock("./session", () => ({ loadScene: vi.fn(), attach: vi.fn() }));
vi.mock("./api", () => ({ generateDiagram: vi.fn() }));
vi.mock("./EditorActions", () => ({
  EditorActions: (props: { onOpened: (title: string) => void }) => (
    <button onClick={() => props.onOpened("Orders")}>FAKE OPEN</button>
  ),
}));

const order: string[] = [];
vi.mock("./stash", () => ({
  hasSavedDrawing: vi.fn(() => true),
  hasStash: vi.fn(() => true),
  requestRestore: vi.fn(),
  applyPendingRestore: vi.fn(),
  stashCurrentDrawing: vi.fn(() => order.push("stash")),
}));

const good = branching as any;

describe("KovaForgeRoot", () => {
  beforeEach(() => {
    order.length = 0;
    (loadScene as any).mockReset();
    (loadScene as any).mockImplementation(() => order.push("load"));
    (stashCurrentDrawing as any).mockClear();
    window.location.hash = "";
  });

  it("shows the landing first, and the editor for #editor", () => {
    const { unmount } = render(<KovaForgeRoot />);
    expect(screen.getByText("Describe a workflow")).toBeTruthy();
    unmount();
    window.location.hash = "#editor";
    render(<KovaForgeRoot />);
    expect(screen.getByText("EDITOR")).toBeTruthy();
  });

  it("continue shows the editor without a banner", () => {
    render(<KovaForgeRoot />);
    fireEvent.click(screen.getByText("Continue my last drawing"));
    expect(screen.getByText("EDITOR")).toBeTruthy();
    expect(screen.queryByText(/AI draft/)).toBeNull();
    expect(stashCurrentDrawing).not.toHaveBeenCalled();
  });

  it("blank stashes then shows the editor with no banner", () => {
    render(<KovaForgeRoot />);
    fireEvent.click(screen.getByText("Start with a blank canvas"));
    expect(stashCurrentDrawing).toHaveBeenCalled();
    expect(screen.getByText("EDITOR")).toBeTruthy();
    expect(screen.queryByText(/AI draft/)).toBeNull();
  });

  it("draft stashes first, loads a scene, shows and dismisses the banner", async () => {
    (generateDiagram as any).mockResolvedValue({
      ok: true,
      diagram: good,
      repairs: [],
    });
    render(<KovaForgeRoot />);
    fireEvent.change(screen.getByLabelText("Workflow description"), {
      target: { value: "a long enough workflow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate diagram" }));
    await waitFor(() => expect(screen.getByText("EDITOR")).toBeTruthy());
    expect(order).toEqual(["stash", "load"]);
    const scene = (loadScene as any).mock.calls[0][0];
    expect(scene.engine).toBe("excalidraw");
    expect(scene.data.elements.length).toBeGreaterThan(0);
    expect(screen.getByText(/AI draft\. Check it/)).toBeTruthy();
    expect(screen.getByText("Put back my previous drawing")).toBeTruthy();
    fireEvent.click(screen.getByText("Got it"));
    expect(screen.queryByText(/AI draft/)).toBeNull();
  });

  it("shows the copy banner after a share is reopened", () => {
    window.location.hash = "#editor";
    render(<KovaForgeRoot />);
    fireEvent.click(screen.getByText("FAKE OPEN"));
    expect(
      screen.getByText(
        'Opened a copy of "Orders". Changes are not saved to its link. Share again to get a new link.',
      ),
    ).toBeTruthy();
    expect(screen.getByText("Put back my previous drawing")).toBeTruthy();
  });
});
