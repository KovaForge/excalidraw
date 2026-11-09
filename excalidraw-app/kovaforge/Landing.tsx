// Full-page landing: describe a workflow, get an AI draft. No third-party requests.

import { useEffect, useRef, useState } from "react";

import { generateDiagram } from "./api";
import { hasSavedDrawing, hasStash, requestRestore } from "./stash";

import "./kovaforge.css";

import type { Diagram } from "./diagram";

export const MIN_LENGTH = 10;
export const MAX_LENGTH = 4000;

export const Landing = (props: {
  onDraft: (diagram: Diagram, repairs: string[]) => void;
  onBlank: () => void;
  onContinue: () => void;
}) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const tooShort = text.trim().length < MIN_LENGTH;

  const submit = async () => {
    if (busy) {
      return;
    }
    setAttempted(true);
    if (tooShort) {
      return;
    }
    setError("");
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    const result = await generateDiagram(text, abort.signal);
    if (!mounted.current || controller.current !== abort) {
      return;
    }
    controller.current = null;
    setBusy(false);
    if (result.ok) {
      props.onDraft(result.diagram, result.repairs);
    } else if (!result.aborted) {
      setError(result.message);
    }
  };

  return (
    <main className="kf-landing">
      <div className="kf-landing__column">
        <h1>Describe a workflow</h1>
        <p className="kf-landing__help">
          Write the steps, decisions and who does what. I'll turn it into a
          diagram you can edit.
        </p>
        <label htmlFor="kf-workflow">Workflow description</label>
        <textarea
          id="kf-workflow"
          value={text}
          readOnly={busy}
          maxLength={MAX_LENGTH}
          placeholder="For example: A customer places an order. We check stock. If it is in stock we ship it, otherwise we email the customer."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <p className="kf-landing__counter">
          {text.length} / {MAX_LENGTH}
        </p>
        {attempted && tooShort && (
          <p className="kf-landing__hint">
            Write a little more, at least 10 characters.
          </p>
        )}
        <div className="kf-landing__row">
          <button
            type="button"
            className="kf-primary"
            disabled={busy || tooShort}
            onClick={submit}
          >
            {busy ? "Drawing your diagram…" : "Generate diagram"}
          </button>
          {busy && (
            <button type="button" onClick={() => controller.current?.abort()}>
              Cancel
            </button>
          )}
        </div>
        <p className="kf-landing__status" aria-live="polite">
          {busy ? "Drawing your diagram. This can take up to a minute." : ""}
        </p>
        <p className="kf-landing__error" role="alert">
          {error}
        </p>
        <div className="kf-landing__row">
          <button type="button" onClick={props.onBlank}>
            Start with a blank canvas
          </button>
          {hasSavedDrawing() && (
            <button type="button" onClick={props.onContinue}>
              Continue my last drawing
            </button>
          )}
        </div>
        {hasStash() && (
          <button
            type="button"
            className="kf-landing__link"
            onClick={requestRestore}
          >
            Put back the drawing I had before
          </button>
        )}
      </div>
    </main>
  );
};
