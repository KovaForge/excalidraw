// Opens a saved share in the editor as a copy. The current drawing is stashed first, exactly as the draft path does.

import { setCurrentDiagram } from "./currentDiagram";
import { UNAVAILABLE_MESSAGE, chooseReopen } from "./reopen";
import { getEngine, getLayout } from "./registry";
import { loadScene } from "./session";
import { stashCurrentDrawing } from "./stash";

import type { ShareDetail } from "./shares-api";

export const BROKEN_MESSAGE = "This diagram could not be opened. Try again.";

export function openShare(
  detail: ShareDetail,
): { ok: true } | { ok: false; message: string } {
  const engine = getEngine();
  const kind = chooseReopen(detail, {
    id: engine.id,
    version: engine.version,
  });
  if (kind === "unavailable") {
    return { ok: false, message: UNAVAILABLE_MESSAGE };
  }
  let scene = detail.scene;
  if (kind === "layout") {
    try {
      scene = engine.toScene(getLayout().layout(detail.diagram!));
    } catch {
      return { ok: false, message: BROKEN_MESSAGE };
    }
  } else if (!Array.isArray((scene.data as any)?.elements)) {
    return { ok: false, message: BROKEN_MESSAGE };
  }
  stashCurrentDrawing();
  setCurrentDiagram(detail.diagram);
  loadScene(scene);
  return { ok: true };
}
