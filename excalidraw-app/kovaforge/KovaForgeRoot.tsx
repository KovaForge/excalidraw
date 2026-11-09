// Landing first, then the editor. Everything KovaForge adds around the upstream app mounts from here.

import { useState } from "react";

import ExcalidrawApp from "../App";

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
  const [draft, setDraft] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (view === "landing") {
    return (
      <Landing
        onContinue={() => {
          setDraft(false);
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
          setDraft(false);
          setView("editor");
        }}
        onDraft={(diagram: Diagram) => {
          stashCurrentDrawing();
          const positioned = getLayout().layout(diagram);
          const scene = getEngine().toScene(positioned);
          setCurrentDiagram(diagram);
          loadScene(scene);
          setDismissed(false);
          setDraft(true);
          setView("editor");
        }}
      />
    );
  }

  return (
    <>
      <ExcalidrawApp />
      {draft && !dismissed && (
        <div className="kf-banner" role="status">
          <span>
            AI draft. Check it and change anything you like. It is not saved or
            shared until you choose.
          </span>
          {hasStash() && (
            <button type="button" onClick={requestRestore}>
              Put back my previous drawing
            </button>
          )}
          <button type="button" onClick={() => setDismissed(true)}>
            Got it
          </button>
        </div>
      )}
    </>
  );
};
