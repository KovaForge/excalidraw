// Client for the hub's generate endpoint (same origin). Never logs the text it sends.

import { validateDiagram } from "./diagram";

import type { Diagram } from "./diagram";

export type GenerateResult =
  | { ok: true; diagram: Diagram; repairs: string[] }
  | { ok: false; aborted: true }
  | { ok: false; aborted?: false; message: string; signedOut?: boolean };

export const GENERATE_URL = "/canvas/api/generate";

export const SIGNED_OUT =
  "Your sign-in has ended. Sign in again at kovaforge.org, then come back.";
export const NOT_AVAILABLE = "Canvas is not available for your account.";
export const NETWORK =
  "Could not reach the server. Check your connection and try again.";
const UNUSABLE =
  "The server sent back something that is not a usable diagram. Try again.";
export const GENERIC = "Something went wrong. Try again.";

const fail = (message: string, signedOut?: boolean): GenerateResult =>
  signedOut ? { ok: false, message, signedOut: true } : { ok: false, message };

export async function generateDiagram(
  text: string,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  let response: Response;
  try {
    response = await fetch(GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ text }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted || (error as Error)?.name === "AbortError") {
      return { ok: false, aborted: true };
    }
    return fail(NETWORK);
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch (error) {
    if (signal?.aborted || (error as Error)?.name === "AbortError") {
      return { ok: false, aborted: true };
    }
  }

  if (response.ok) {
    const checked = validateDiagram(body?.diagram);
    if (!checked.ok) {
      return fail(UNUSABLE);
    }
    const repairs = Array.isArray(body?.repairs)
      ? body.repairs.filter((r: unknown) => typeof r === "string")
      : [];
    return {
      ok: true,
      diagram: checked.diagram,
      repairs: [...new Set([...repairs, ...checked.repairs])],
    };
  }

  if (response.status === 401) {
    return fail(SIGNED_OUT, true);
  }
  if (response.status === 404) {
    return fail(NOT_AVAILABLE);
  }
  const serverMessage =
    typeof body?.error === "string" && body.error.trim() ? body.error : "";
  return fail(serverMessage || GENERIC);
}
