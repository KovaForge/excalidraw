// Hands a scene to the mounted editor. A scene queued before the editor attaches is applied on attach.

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type { EngineScene } from "./engine";

export const FIT_TOP_PX = 100;
export const FIT_BOTTOM_PX = 140;

let api: ExcalidrawImperativeAPI | null = null;
let queued: EngineScene | null = null;

function apply(target: ExcalidrawImperativeAPI, scene: EngineScene) {
  const data = scene.data as {
    elements: any[];
    appState?: Record<string, any>;
  };
  target.updateScene({
    elements: data.elements as any,
    appState: data.appState as any,
  });
  const shown = target.getSceneElements();
  if (shown.length) {
    // this version of Excalidraw has setViewport in place of scrollToContent.
    // Inset the usable area (toolbar and hint above, banner and zoom controls below,
    // 10% each side) so the draft opens clear of the overlaid UI; "scale-down"
    // never zooms past 100% for small diagrams.
    const side = Math.round(target.getAppState().width * 0.1);
    target.setViewport({
      target: shown,
      fit: "scale-down",
      animation: false,
      offsets: {
        top: FIT_TOP_PX,
        bottom: FIT_BOTTOM_PX,
        left: side,
        right: side,
      },
    });
  }
}

export function attach(next: ExcalidrawImperativeAPI | null) {
  api = next;
  if (api && queued) {
    const scene = queued;
    queued = null;
    apply(api, scene);
  }
}

export function loadScene(scene: EngineScene) {
  if (api) {
    apply(api, scene);
  } else {
    queued = scene;
  }
}
