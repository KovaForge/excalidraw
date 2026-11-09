import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { MyDiagrams } from "./MyDiagrams";
import { copyText } from "./copy";
import { openShare } from "./openShare";
import { deleteShare, getShare, listShares } from "./shares-api";

vi.mock("./shares-api", () => ({
  listShares: vi.fn(),
  getShare: vi.fn(),
  deleteShare: vi.fn(),
}));
vi.mock("./copy", () => ({ copyText: vi.fn() }));
vi.mock("./openShare", () => ({ openShare: vi.fn() }));

const row = (id: string, title: string) => ({
  id,
  title,
  engine: "excalidraw@0.18.0",
  size: 1,
  createdAt: "2026-11-09T01:02:03.000Z",
  url: `https://x/canvas/s/${id}/t`,
});

describe("MyDiagrams", () => {
  beforeEach(() => {
    for (const f of [listShares, getShare, deleteShare, copyText, openShare]) {
      (f as any).mockReset();
    }
  });

  it("shows loading, then the rows", async () => {
    (listShares as any).mockResolvedValue({
      ok: true,
      value: [row("a", "Orders"), row("b", "Hiring")],
    });
    render(<MyDiagrams onClose={() => {}} onOpened={() => {}} />);
    expect(screen.getByText("Loading…")).toBeTruthy();
    expect(await screen.findByText("Orders")).toBeTruthy();
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "My diagrams" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Copy link" })).toHaveLength(
      2,
    );
    expect(
      screen.getAllByRole("button", { name: "Open in editor" }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Remove link" })).toHaveLength(
      2,
    );
  });

  it("shows the empty state and the error state", async () => {
    (listShares as any).mockResolvedValue({ ok: true, value: [] });
    const { unmount } = render(
      <MyDiagrams onClose={() => {}} onOpened={() => {}} />,
    );
    expect(await screen.findByText("Nothing shared yet.")).toBeTruthy();
    unmount();
    (listShares as any).mockResolvedValue({
      ok: false,
      message: "Could not reach the server.",
    });
    render(<MyDiagrams onClose={() => {}} onOpened={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Could not reach the server.",
      ),
    );
  });

  it("copies the link", async () => {
    (listShares as any).mockResolvedValue({
      ok: true,
      value: [row("a", "Orders")],
    });
    (copyText as any).mockResolvedValue(true);
    render(<MyDiagrams onClose={() => {}} onOpened={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Copy link" }));
    await waitFor(() =>
      expect(copyText).toHaveBeenCalledWith("https://x/canvas/s/a/t"),
    );
  });

  it("removes only after the inline confirm, then refreshes", async () => {
    const confirm = vi.spyOn(window, "confirm");
    (listShares as any)
      .mockResolvedValueOnce({ ok: true, value: [row("a", "Orders")] })
      .mockResolvedValueOnce({ ok: true, value: [] });
    (deleteShare as any).mockResolvedValue({ ok: true, value: true });
    render(<MyDiagrams onClose={() => {}} onOpened={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove link" }));
    expect(
      screen.getByText("Remove this link? It stops working at once."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(deleteShare).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Nothing shared yet.")).toBeTruthy();
    expect((deleteShare as any).mock.calls[0][0]).toBe("a");
    expect(listShares).toHaveBeenCalledTimes(2);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("opens a share in the editor through the reopen path", async () => {
    const detail = {
      title: "Orders",
      engine: { id: "excalidraw", version: "0.18.0" },
      diagram: null,
      scene: {},
    };
    (listShares as any).mockResolvedValue({
      ok: true,
      value: [row("a", "Orders")],
    });
    (getShare as any).mockResolvedValue({ ok: true, value: detail });
    (openShare as any).mockReturnValue({ ok: true });
    const onOpened = vi.fn();
    const onClose = vi.fn();
    render(<MyDiagrams onClose={onClose} onOpened={onOpened} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Open in editor" }),
    );
    await waitFor(() => expect(onOpened).toHaveBeenCalledWith("Orders"));
    expect(openShare).toHaveBeenCalledWith(detail);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the unavailable message and stays open", async () => {
    (listShares as any).mockResolvedValue({
      ok: true,
      value: [row("a", "Orders")],
    });
    (getShare as any).mockResolvedValue({ ok: true, value: {} });
    (openShare as any).mockReturnValue({
      ok: false,
      message:
        "This diagram was made with a different editor and cannot be reopened here. Its picture is still shared.",
    });
    const onOpened = vi.fn();
    render(<MyDiagrams onClose={() => {}} onOpened={onOpened} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Open in editor" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/different editor/),
    );
    expect(onOpened).not.toHaveBeenCalled();
  });
});
