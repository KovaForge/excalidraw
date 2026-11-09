// Client for the hub's share endpoints (same origin). Never logs titles, diagrams or scenes.

import { GENERIC, NETWORK, NOT_AVAILABLE, SIGNED_OUT } from "./api";
import { validateDiagram } from "./diagram";

import type { Diagram } from "./diagram";
import type { EngineScene } from "./engine";

export const SHARES_URL = "/canvas/api/shares";

const GONE = "That diagram is not shared any more.";
const UNUSABLE = "The server sent back something unexpected. Try again.";

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; aborted: true }
  | { ok: false; aborted?: false; message: string; signedOut?: boolean };

export type ShareParts = {
  title: string;
  engine: { id: string; version: string };
  /** Only when the drawing came from a generated draft. */
  diagram?: Diagram | null;
  scene: EngineScene;
  /** The engine's exportSvg output, as is. */
  svg: string;
  png: Blob;
};

export type ShareSummary = {
  id: string;
  title: string;
  engine: string;
  size: number;
  createdAt: string;
  url: string;
};

export type ShareDetail = {
  title: string;
  engine: { id: string; version: string };
  diagram: Diagram | null;
  scene: EngineScene;
};

const fail = <T>(message: string, signedOut?: boolean): ApiResult<T> =>
  signedOut ? { ok: false, message, signedOut: true } : { ok: false, message };

const isAbort = (error: unknown, signal?: AbortSignal) =>
  !!signal?.aborted || (error as Error)?.name === "AbortError";

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function call<T>(
  url: string,
  init: RequestInit,
  signal: AbortSignal | undefined,
  gone: string,
  read: (body: any) => T | null,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    return isAbort(error, signal)
      ? { ok: false, aborted: true }
      : fail(NETWORK);
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch (error) {
    if (isAbort(error, signal)) {
      return { ok: false, aborted: true };
    }
  }

  if (response.ok) {
    let value: T | null = null;
    try {
      value = read(body);
    } catch {
      value = null;
    }
    return value === null ? fail(UNUSABLE) : { ok: true, value };
  }
  if (response.status === 401) {
    return fail(SIGNED_OUT, true);
  }
  if (response.status === 404) {
    return fail(gone);
  }
  const serverMessage =
    typeof body?.error === "string" && body.error.trim() ? body.error : "";
  return fail(serverMessage || GENERIC);
}

export function createShare(
  parts: ShareParts,
  signal?: AbortSignal,
): Promise<ApiResult<{ id: string; url: string }>> {
  const form = new FormData();
  form.append(
    "meta",
    JSON.stringify({ title: parts.title, engine: parts.engine }),
  );
  if (parts.diagram) {
    form.append("diagram", JSON.stringify(parts.diagram));
  }
  form.append("scene", JSON.stringify(parts.scene));
  form.append(
    "svg",
    new File([parts.svg], "diagram.svg", { type: "image/svg+xml" }),
  );
  form.append(
    "png",
    new File([parts.png], "diagram.png", { type: "image/png" }),
  );
  return call(
    SHARES_URL,
    { method: "POST", body: form },
    signal,
    NOT_AVAILABLE,
    (body) =>
      isObject(body) &&
      typeof body.id === "string" &&
      body.id &&
      typeof body.url === "string" &&
      body.url
        ? { id: body.id, url: body.url }
        : null,
  );
}

export function listShares(
  signal?: AbortSignal,
): Promise<ApiResult<ShareSummary[]>> {
  return call(SHARES_URL, { method: "GET" }, signal, NOT_AVAILABLE, (body) => {
    if (!isObject(body) || !Array.isArray(body.shares)) {
      return null;
    }
    const shares: ShareSummary[] = [];
    for (const row of body.shares) {
      if (
        !isObject(row) ||
        typeof row.id !== "string" ||
        typeof row.title !== "string" ||
        typeof row.url !== "string"
      ) {
        return null;
      }
      shares.push({
        id: row.id,
        title: row.title,
        engine: typeof row.engine === "string" ? row.engine : "",
        size: typeof row.size === "number" ? row.size : 0,
        createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
        url: row.url,
      });
    }
    return shares;
  });
}

export function getShare(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResult<ShareDetail>> {
  return call(
    `${SHARES_URL}/${encodeURIComponent(id)}`,
    { method: "GET" },
    signal,
    GONE,
    (body) => {
      if (
        !isObject(body) ||
        typeof body.title !== "string" ||
        !isObject(body.engine) ||
        typeof body.engine.id !== "string" ||
        typeof body.engine.version !== "string" ||
        !isObject(body.scene) ||
        typeof body.scene.engine !== "string" ||
        typeof body.scene.version !== "string" ||
        !isObject(body.scene.data)
      ) {
        return null;
      }
      let diagram: Diagram | null = null;
      if (body.diagram !== null && body.diagram !== undefined) {
        const checked = validateDiagram(body.diagram);
        if (!checked.ok) {
          return null;
        }
        diagram = checked.diagram;
      }
      return {
        title: body.title,
        engine: { id: body.engine.id, version: body.engine.version },
        diagram,
        scene: body.scene as EngineScene,
      };
    },
  );
}

export function deleteShare(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResult<true>> {
  return call(
    `${SHARES_URL}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    signal,
    GONE,
    (body) => (isObject(body) && body.ok === true ? (true as const) : null),
  );
}
