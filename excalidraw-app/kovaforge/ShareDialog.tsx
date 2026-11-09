// "Share this diagram": snapshots the drawing on screen and makes a link. The drawing is never changed.

import { useEffect, useRef, useState } from "react";

import { Modal } from "./Modal";
import { copyText } from "./copy";
import { getCurrentDiagram } from "./currentDiagram";
import { getEngine } from "./registry";
import { getScene } from "./session";
import { createShare } from "./shares-api";

export const MAX_TITLE = 80;
export const EMPTY_HINT = "Draw or generate something first.";

export const ShareDialog = (props: { onClose: () => void }) => {
  const [title, setTitle] = useState(
    () => getCurrentDiagram()?.title?.slice(0, MAX_TITLE) || "My diagram",
  );
  const [empty] = useState(() => getScene() === null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const timer = useRef<number | undefined>(undefined);

  // The pressed button disables itself on success, which would drop focus to
  // <body> and break the dialog's Tab trap: move it to the link instead.
  useEffect(() => {
    if (link) {
      input.current?.focus();
    }
  }, [link]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      window.clearTimeout(timer.current);
    };
  }, []);

  const create = async () => {
    if (busy || empty) {
      return;
    }
    const scene = getScene();
    if (!scene) {
      setError(EMPTY_HINT);
      return;
    }
    setError("");
    setCopied(false);
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const engine = getEngine(scene.engine);
      const svg = await engine.exportSvg(scene);
      const png = await engine.exportPng(scene);
      const diagram = getCurrentDiagram();
      const result = await createShare(
        {
          title: title.trim() || "My diagram",
          engine: { id: engine.id, version: engine.version },
          ...(diagram ? { diagram } : {}),
          scene,
          svg,
          png,
        },
        abort.signal,
      );
      if (!mounted.current || controller.current !== abort) {
        return;
      }
      if (result.ok) {
        setLink(result.value);
      } else if (!result.aborted) {
        setLink(null);
        setError(result.message);
      }
    } catch {
      if (mounted.current && controller.current === abort) {
        setError("Could not make the picture of your diagram. Try again.");
      }
    } finally {
      if (mounted.current && controller.current === abort) {
        controller.current = null;
        setBusy(false);
      }
    }
  };

  const copy = async () => {
    if (!link) {
      return;
    }
    const ok = await copyText(link.url);
    if (!mounted.current) {
      return;
    }
    if (ok) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } else {
      input.current?.select();
      setError(
        "Could not copy. The link is selected: press Ctrl+C to copy it.",
      );
    }
  };

  return (
    <Modal titleId="kf-share-title" onClose={props.onClose}>
      <h2 id="kf-share-title">Share this diagram</h2>
      <p>
        Anyone with the link can see a picture of this diagram. It is a
        snapshot: later changes are not included. You can remove the link at any
        time.
      </p>
      <label htmlFor="kf-share-name">Title</label>
      <input
        id="kf-share-name"
        type="text"
        value={title}
        maxLength={MAX_TITLE}
        disabled={busy}
        onChange={(event) => setTitle(event.target.value)}
      />
      {empty && <p className="kf-modal__hint">{EMPTY_HINT}</p>}
      <div className="kf-modal__row">
        <button
          type="button"
          className="kf-primary"
          disabled={busy || empty}
          onClick={create}
        >
          {busy ? "Making your link…" : "Create link"}
        </button>
        <button type="button" onClick={props.onClose}>
          Close
        </button>
      </div>
      <p className="kf-modal__error" role="alert">
        {error}
      </p>
      {link && (
        <div className="kf-modal__result">
          <label htmlFor="kf-share-link">Your link</label>
          <input
            id="kf-share-link"
            ref={input}
            type="text"
            readOnly
            value={link.url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="kf-modal__row">
            <button type="button" onClick={copy}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              Open
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
};
