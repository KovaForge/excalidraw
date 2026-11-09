// Decides how a saved share is reopened in the editor. Pure: no browser, no network.

import type { Diagram } from "./diagram";

export type ReopenKind = "scene" | "layout" | "unavailable";

export const UNAVAILABLE_MESSAGE =
  "This diagram was made with a different editor and cannot be reopened here. Its picture is still shared.";

type EngineRef = { id: string; version: string };

const parse = (version: string) => {
  const match = /^(\d+)\.(\d+)(?:[.\-+]|$)/.exec(version);
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
};

/**
 * Compatibility rule: the same engine id, and either the identical version string, or the same major version.
 * Before 1.0 a minor bump may break scenes, so for major 0 the minor must match too.
 * A version that cannot be read is compatible only when the strings are identical.
 */
export function versionsCompatible(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  const x = parse(a);
  const y = parse(b);
  if (!x || !y || x.major !== y.major) {
    return false;
  }
  return x.major === 0 ? x.minor === y.minor : true;
}

/**
 * "scene": the saved scene opens as it is. "layout": the editors differ but the neutral diagram was saved, so it is laid
 * out again with the default layout and engine. "unavailable": nothing to rebuild from.
 */
export function chooseReopen(
  share: { engine: EngineRef; diagram: Diagram | null },
  currentEngine: EngineRef,
): ReopenKind {
  if (
    share.engine.id === currentEngine.id &&
    versionsCompatible(share.engine.version, currentEngine.version)
  ) {
    return "scene";
  }
  return share.diagram ? "layout" : "unavailable";
}
