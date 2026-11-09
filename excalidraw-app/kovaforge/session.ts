// Hands a scene to the mounted editor. A scene queued before the editor attaches is applied on attach.

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type { EngineScene } from "./engine";

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
    // this version of Excalidraw has setViewport in place of scrollToContent
    target.setViewport({ target: shown, fit: "scale-down", animation: false });
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
