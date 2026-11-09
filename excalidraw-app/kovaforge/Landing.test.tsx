import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Landing } from "./Landing";

import { generateDiagram } from "./api";
import { hasSavedDrawing, hasStash } from "./stash";

vi.mock("./api", () => ({ generateDiagram: vi.fn() }));
vi.mock("./stash", () => ({
  hasSavedDrawing: vi.fn(() => false),
  hasStash: vi.fn(() => false),
  requestRestore: vi.fn(),
}));

const gen = generateDiagram as unknown as ReturnType<typeof vi.fn>;
const props = () => ({
  onDraft: vi.fn(),
  onBlank: vi.fn(),
  onContinue: vi.fn(),
});
const box = () =>
  screen.getByLabelText("Workflow description") as HTMLTextAreaElement;
const type = (v: string) => fireEvent.change(box(), { target: { value: v } });

describe("Landing", () => {
  beforeEach(() => {
    gen.mockReset();
    (hasSavedDrawing as any).mockReturnValue(false);
    (hasStash as any).mockReturnValue(false);
  });

  it("has a labelled box, counter and a disabled button until 10 characters", () => {
    render(<Landing {...props()} />);
    const button = screen.getByRole("button", { name: "Generate diagram" });
    expect(button).toBeDisabled();
    type("123456789 "); // 9 trimmed
    expect(button).toBeDisabled();
    type("1234567890");
    expect(button).toBeEnabled();
    expect(screen.getByText("10 / 4000")).toBeTruthy();
  });

  it("shows the error, keeps the text", async () => {
    gen.mockResolvedValue({ ok: false, message: "Server said no" });
    render(<Landing {...props()} />);
    type("a long enough workflow");
    fireEvent.click(screen.getByRole("button", { name: "Generate diagram" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Server said no",
    );
    expect(box().value).toBe("a long enough workflow");
  });

  it("cancel aborts and shows no error", async () => {
    let signal!: AbortSignal;
    gen.mockImplementation(
      (_t: string, s: AbortSignal) =>
        new Promise((resolve) => {
          signal = s;
          s.addEventListener("abort", () =>
            resolve({ ok: false, aborted: true }),
          );
        }),
    );
    render(<Landing {...props()} />);
    type("a long enough workflow");
    fireEvent.click(screen.getByRole("button", { name: "Generate diagram" }));
    expect(
      screen.getByRole("button", { name: "Drawing your diagram…" }),
    ).toBeTruthy();
    expect(box().readOnly).toBe(true);
    expect(screen.getByText(/up to a minute/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(signal.aborted).toBe(true));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Generate diagram" }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("Ctrl+Enter submits and hands the draft over", async () => {
    const p = props();
    const diagram = {
      version: 1,
      title: "t",
      direction: "TB",
      nodes: [],
      edges: [],
    };
    gen.mockResolvedValue({ ok: true, diagram, repairs: ["r"] });
    render(<Landing {...p} />);
    type("a long enough workflow");
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(p.onDraft).toHaveBeenCalledWith(diagram, ["r"]));
    expect(gen.mock.calls[0][0]).toBe("a long enough workflow");
  });

  it("offers Continue only with a saved drawing", () => {
    const { unmount } = render(<Landing {...props()} />);
    expect(screen.queryByText("Continue my last drawing")).toBeNull();
    unmount();
    (hasSavedDrawing as any).mockReturnValue(true);
    render(<Landing {...props()} />);
    expect(screen.getByText("Continue my last drawing")).toBeTruthy();
  });

  it("offers the restore link only with a stash", () => {
    const { unmount } = render(<Landing {...props()} />);
    expect(screen.queryByText("Put back the drawing I had before")).toBeNull();
    unmount();
    (hasStash as any).mockReturnValue(true);
    render(<Landing {...props()} />);
    expect(screen.getByText("Put back the drawing I had before")).toBeTruthy();
  });
});
