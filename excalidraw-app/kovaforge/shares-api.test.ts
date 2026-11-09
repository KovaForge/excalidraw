import { createShare, deleteShare, getShare, listShares } from "./shares-api";
import { branching } from "./fixtures";

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const scene = {
  engine: "excalidraw",
  version: "0.18.0",
  data: { elements: [] },
};
const parts = (diagram?: any) => ({
  title: "SECRET-TITLE",
  engine: { id: "excalidraw", version: "0.18.0" },
  ...(diagram ? { diagram } : {}),
  scene,
  svg: "<svg></svg>",
  png: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
    type: "image/png",
  }),
});

describe("shares api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts the five parts, with the diagram only when given", async () => {
    const f = reply(201, { id: "a1", url: "https://x/canvas/s/a1/t" });
    vi.stubGlobal("fetch", f);
    const r = await createShare(parts(branching));
    expect(r).toEqual({
      ok: true,
      value: { id: "a1", url: "https://x/canvas/s/a1/t" },
    });
    expect(f.mock.calls[0][0]).toBe("/canvas/api/shares");
    expect(f.mock.calls[0][1].method).toBe("POST");
    const form: FormData = f.mock.calls[0][1].body;
    expect([...form.keys()]).toEqual([
      "meta",
      "diagram",
      "scene",
      "svg",
      "png",
    ]);
    expect(JSON.parse(form.get("meta") as string)).toEqual({
      title: "SECRET-TITLE",
      engine: { id: "excalidraw", version: "0.18.0" },
    });
    const svg = form.get("svg") as File;
    expect(svg.name).toBe("diagram.svg");
    expect(svg.type).toBe("image/svg+xml");
    expect(svg.size).toBe("<svg></svg>".length);
    expect((form.get("png") as File).name).toBe("diagram.png");
    expect((form.get("png") as File).type).toBe("image/png");

    await createShare(parts());
    expect([...f.mock.calls[1][1].body.keys()]).toEqual([
      "meta",
      "scene",
      "svg",
      "png",
    ]);
  });

  it("maps 401, 404 and server messages (including 429)", async () => {
    vi.stubGlobal("fetch", reply(401, {}));
    expect(await createShare(parts())).toEqual({
      ok: false,
      signedOut: true,
      message:
        "Your sign-in has ended. Sign in again at kovaforge.org, then come back.",
    });
    vi.stubGlobal("fetch", reply(404, {}));
    expect(await listShares()).toEqual({
      ok: false,
      message: "Canvas is not available for your account.",
    });
    vi.stubGlobal("fetch", reply(404, {}));
    expect(await deleteShare("a")).toMatchObject({
      ok: false,
      message: "That diagram is not shared any more.",
    });
    for (const s of [400, 413, 429, 502]) {
      vi.stubGlobal("fetch", reply(s, { error: `plain ${s}` }));
      expect(await createShare(parts())).toEqual({
        ok: false,
        message: `plain ${s}`,
      });
    }
    vi.stubGlobal("fetch", reply(500, {}));
    expect(await createShare(parts())).toEqual({
      ok: false,
      message: "Something went wrong. Try again.",
    });
  });

  it("reports network failure and abort", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("x")));
    expect(await listShares()).toEqual({
      ok: false,
      message:
        "Could not reach the server. Check your connection and try again.",
    });
    const c = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        c.abort();
        return Promise.reject(new DOMException("a", "AbortError"));
      }),
    );
    expect(await getShare("a", c.signal)).toEqual({ ok: false, aborted: true });
  });

  it("lists, fetches and deletes with valid shapes", async () => {
    const row = {
      id: "a",
      title: "T",
      engine: "excalidraw@0.18.0",
      size: 5,
      createdAt: "2026-01-01T00:00:00Z",
      url: "https://x/a",
    };
    vi.stubGlobal("fetch", reply(200, { shares: [row] }));
    expect(await listShares()).toEqual({ ok: true, value: [row] });

    const f = reply(200, {
      title: "T",
      engine: { id: "excalidraw", version: "0.18.0" },
      diagram: branching,
      scene,
    });
    vi.stubGlobal("fetch", f);
    const got = await getShare("a b");
    expect(f.mock.calls[0][0]).toBe("/canvas/api/shares/a%20b");
    expect(got.ok && got.value.diagram?.nodes.length).toBeGreaterThan(0);

    vi.stubGlobal(
      "fetch",
      reply(200, {
        title: "T",
        engine: { id: "e", version: "1" },
        diagram: null,
        scene,
      }),
    );
    const none = await getShare("a");
    expect(none.ok && none.value.diagram).toBeNull();

    const d = reply(200, { ok: true });
    vi.stubGlobal("fetch", d);
    expect(await deleteShare("a")).toEqual({ ok: true, value: true });
    expect(d.mock.calls[0][1].method).toBe("DELETE");
  });

  it("turns unknown shapes into an error, never an exception", async () => {
    const unusable = {
      ok: false,
      message: "The server sent back something unexpected. Try again.",
    };
    for (const body of [null, "x", { id: 1 }, { shares: "no" }]) {
      vi.stubGlobal("fetch", reply(201, body));
      expect(await createShare(parts())).toEqual(unusable);
    }
    vi.stubGlobal("fetch", reply(200, { shares: [{ id: "a" }] }));
    expect(await listShares()).toEqual(unusable);
    vi.stubGlobal(
      "fetch",
      reply(200, {
        title: "T",
        engine: { id: "e", version: "1" },
        diagram: { nodes: [] },
        scene,
      }),
    );
    expect(await getShare("a")).toEqual(unusable);
    vi.stubGlobal(
      "fetch",
      reply(200, {
        title: "T",
        engine: { id: "e", version: "1" },
        diagram: null,
        scene: "x",
      }),
    );
    expect(await getShare("a")).toEqual(unusable);
    vi.stubGlobal("fetch", reply(200, { ok: false }));
    expect(await deleteShare("a")).toEqual(unusable);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })),
    );
    expect(await listShares()).toEqual(unusable);
  });

  it("never logs titles or content", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => {}),
    );
    vi.stubGlobal("fetch", reply(502, { error: "bad" }));
    await createShare(parts(branching));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("x")));
    await createShare(parts(branching));
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET");
    }
  });
});
