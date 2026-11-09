import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ShareDialog } from "./ShareDialog";
import { setCurrentDiagram } from "./currentDiagram";
import { branching } from "./fixtures";
import { copyText } from "./copy";
import { getScene } from "./session";
import { createShare } from "./shares-api";

vi.mock("./session", () => ({ getScene: vi.fn() }));
vi.mock("./shares-api", () => ({ createShare: vi.fn() }));
vi.mock("./copy", () => ({ copyText: vi.fn() }));
vi.mock("./registry", () => ({
  getEngine: () => ({
    id: "excalidraw",
    version: "0.18.0",
    exportSvg: vi.fn().mockResolvedValue("<svg></svg>"),
    exportPng: vi
      .fn()
      .mockResolvedValue(new Blob(["png"], { type: "image/png" })),
  }),
}));

const scene = {
  engine: "excalidraw",
  version: "0.18.0",
  data: { elements: [{ id: "a" }] },
};

describe("ShareDialog", () => {
  beforeEach(() => {
    (getScene as any).mockReturnValue(scene);
    (createShare as any).mockReset();
    (createShare as any).mockResolvedValue({
      ok: true,
      value: { id: "i1", url: "https://x/canvas/s/i1/my-diagram" },
    });
    (copyText as any).mockReset();
    setCurrentDiagram(null);
  });

  it("is a labelled modal with the default title and the diagram title when there is one", () => {
    const { unmount } = render(<ShareDialog onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(
      screen.getByRole("heading", { name: "Share this diagram" }),
    ).toBeTruthy();
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "My diagram",
    );
    expect((screen.getByLabelText("Title") as HTMLInputElement).maxLength).toBe(
      80,
    );
    unmount();
    setCurrentDiagram(branching);
    render(<ShareDialog onClose={() => {}} />);
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      branching.title,
    );
  });

  it("disables Create link on an empty drawing with the hint", () => {
    (getScene as any).mockReturnValue(null);
    render(<ShareDialog onClose={() => {}} />);
    expect(
      (screen.getByRole("button", { name: "Create link" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("Draw or generate something first.")).toBeTruthy();
  });

  it("creates a link, shows it, copies it and offers Open", async () => {
    (copyText as any).mockResolvedValue(true);
    render(<ShareDialog onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Orders" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    const link = (await screen.findByLabelText(
      "Your link",
    )) as HTMLInputElement;
    expect(link.value).toBe("https://x/canvas/s/i1/my-diagram");
    expect(link.readOnly).toBe(true);
    const sent = (createShare as any).mock.calls[0][0];
    expect(sent.title).toBe("Orders");
    expect(sent.engine).toEqual({ id: "excalidraw", version: "0.18.0" });
    expect(sent.svg).toBe("<svg></svg>");
    expect("diagram" in sent).toBe(false);
    const open = screen.getByRole("link", { name: "Open" });
    expect(open.getAttribute("target")).toBe("_blank");
    expect(open.getAttribute("rel")).toBe("noopener noreferrer");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
    expect(copyText).toHaveBeenCalledWith("https://x/canvas/s/i1/my-diagram");
  });

  it("sends the diagram when the drawing came from a draft", async () => {
    setCurrentDiagram(branching);
    render(<ShareDialog onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await screen.findByLabelText("Your link");
    expect((createShare as any).mock.calls[0][0].diagram).toBe(branching);
  });

  it("shows the working label, then the error in an alert and leaves the drawing alone", async () => {
    let finish: (v: any) => void = () => {};
    (createShare as any).mockReturnValue(new Promise((r) => (finish = r)));
    render(<ShareDialog onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    expect(
      await screen.findByRole("button", { name: "Making your link…" }),
    ).toBeTruthy();
    finish({
      ok: false,
      message: "You have 50 shared diagrams. Remove one to share another.",
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "You have 50 shared diagrams. Remove one to share another.",
      ),
    );
    expect(screen.queryByLabelText("Your link")).toBeNull();
    expect(screen.getByRole("button", { name: "Create link" })).toBeTruthy();
    expect(getScene).toHaveBeenCalled();
  });

  it("a second Create link makes a new snapshot", async () => {
    render(<ShareDialog onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await screen.findByLabelText("Your link");
    (createShare as any).mockResolvedValue({
      ok: true,
      value: { id: "i2", url: "https://x/canvas/s/i2/my-diagram" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Your link") as HTMLInputElement).value,
      ).toBe("https://x/canvas/s/i2/my-diagram"),
    );
    expect(createShare).toHaveBeenCalledTimes(2);
  });

  it("Escape closes and focus returns to the opener", () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<ShareDialog onClose={onClose} />);
    expect(document.activeElement).not.toBe(opener);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
      true,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
