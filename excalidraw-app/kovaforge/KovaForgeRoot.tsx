// Landing first, then the editor. Everything KovaForge adds around the upstream app mounts from here.

import { useState } from "react";

import ExcalidrawApp from "../App";

import { EditorActions } from "./EditorActions";
import { Landing } from "./Landing";
import { setCurrentDiagram } from "./currentDiagram";
import { getEngine, getLayout, registerDefaults } from "./registry";
import { loadScene } from "./session";
import {
  applyPendingRestore,
  hasStash,
  requestRestore,
  stashCurrentDrawing,
} from "./stash";

import "./kovaforge.css";

import type { Diagram } from "./diagram";

type View = "landing" | "editor";

let started = false;
const startup = () => {
  if (!started) {
    started = true;
    applyPendingRestore();
    registerDefaults();
  }
};

export const KovaForgeRoot = () => {
  startup();
  const [view, setView] = useState<View>(
    window.location.hash === "#editor" ? "editor" : "landing",
  );
  const [banner, setBanner] = useState<
    { kind: "draft" } | { kind: "copy"; title: string } | null
  >(null);

  if (view === "landing") {
    return (
      <Landing
        onContinue={() => {
          setBanner(null);
          setView("editor");
        }}
        onBlank={() => {
          stashCurrentDrawing();
          setCurrentDiagram(null);
          loadScene({
            engine: "excalidraw",
            version: "",
            data: { elements: [], appState: {} },
          });
          setBanner(null);
          setView("editor");
        }}
        onDraft={(diagram: Diagram) => {
          stashCurrentDrawing();
          const positioned = getLayout().layout(diagram);
          const scene = getEngine().toScene(positioned);
          setCurrentDiagram(diagram);
          loadScene(scene);
          setBanner({ kind: "draft" });
          setView("editor");
        }}
      />
    );
  }

  return (
    <>
      <ExcalidrawApp />
      <EditorActions onOpened={(title) => setBanner({ kind: "copy", title })} />
      {banner && (
        <div className="kf-banner" role="status">
          <span>
            {banner.kind === "draft"
              ? "AI draft. Check it and change anything you like. It is not saved or shared until you choose."
              : `Opened a copy of "${banner.title}". Changes are not saved to its link. Share again to get a new link.`}
          </span>
          {hasStash() && (
            <button type="button" onClick={requestRestore}>
              Put back my previous drawing
            </button>
          )}
          <button type="button" onClick={() => setBanner(null)}>
            Got it
          </button>
        </div>
      )}
    </>
  );
};
