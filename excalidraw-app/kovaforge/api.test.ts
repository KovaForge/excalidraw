import { generateDiagram } from "./api";
import { branching } from "./fixtures";

const good = branching as any;
const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("generateDiagram", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts JSON to the same-origin endpoint and returns a validated diagram", async () => {
    const fetchMock = reply(200, { diagram: good, repairs: ["x"] });
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateDiagram("hello world, a flow");
    expect(fetchMock.mock.calls[0][0]).toBe("/canvas/api/generate");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      text: "hello world, a flow",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diagram.nodes.length).toBeGreaterThan(0);
      expect(result.repairs).toContain("x");
    }
  });

  it("rejects an invalid diagram from the server", async () => {
    vi.stubGlobal("fetch", reply(200, { diagram: { nodes: [] }, repairs: [] }));
    const result = await generateDiagram("some text here");
    expect(result.ok).toBe(false);
  });

  it("maps 401 to the signed-out message", async () => {
    vi.stubGlobal("fetch", reply(401, {}));
    expect(await generateDiagram("some text here")).toEqual({
      ok: false,
      message:
        "Your sign-in has ended. Sign in again at kovaforge.org, then come back.",
      signedOut: true,
    });
  });

  it("maps 404", async () => {
    vi.stubGlobal("fetch", reply(404, {}));
    expect(await generateDiagram("some text here")).toEqual({
      ok: false,
      message: "Canvas is not available for your account.",
    });
  });

  it.each([400, 422, 429, 502, 504])(
    "uses the server error for %i",
    async (s) => {
      vi.stubGlobal("fetch", reply(s, { error: `plain ${s}` }));
      expect(await generateDiagram("some text here")).toEqual({
        ok: false,
        message: `plain ${s}`,
      });
    },
  );

  it("reports a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    expect(await generateDiagram("some text here")).toEqual({
      ok: false,
      message:
        "Could not reach the server. Check your connection and try again.",
    });
  });

  it("reports an abort without a message", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException("aborted", "AbortError"));
      }),
    );
    expect(await generateDiagram("some text here", controller.signal)).toEqual({
      ok: false,
      aborted: true,
    });
  });

  it("never writes the text to the console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => {}),
    );
    vi.stubGlobal("fetch", reply(502, { error: "bad" }));
    await generateDiagram("SECRET-WORKFLOW-TEXT");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("x")));
    await generateDiagram("SECRET-WORKFLOW-TEXT");
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET");
    }
  });
});
