// "My diagrams": the person's shared links. Copy, open as an editable copy, or remove.

import { useCallback, useEffect, useRef, useState } from "react";

import { Modal } from "./Modal";
import { copyText } from "./copy";
import { openShare } from "./openShare";
import { deleteShare, getShare, listShares } from "./shares-api";

import type { ShareSummary } from "./shares-api";

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export const MyDiagrams = (props: {
  onClose: () => void;
  onOpened: (title: string) => void;
}) => {
  const [shares, setShares] = useState<ShareSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const result = await listShares(abort.signal);
    if (!mounted.current || controller.current !== abort) {
      return;
    }
    if (result.ok) {
      setLoadError("");
      setShares(result.value);
    } else if (!result.aborted) {
      setShares(null);
      setLoadError(result.message);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [load]);

  const copy = async (share: ShareSummary) => {
    const ok = await copyText(share.url);
    if (mounted.current) {
      setError("");
      setNote(ok ? `Link to "${share.title}" copied.` : "");
      if (!ok) {
        setError(
          "Could not copy. Use Open to get the link from the address bar.",
        );
      }
    }
  };

  const open = async (share: ShareSummary) => {
    setError("");
    setNote("");
    setBusyId(share.id);
    const result = await getShare(share.id);
    if (!mounted.current) {
      return;
    }
    setBusyId(null);
    if (!result.ok) {
      if (!result.aborted) {
        setError(result.message);
      }
      return;
    }
    const opened = openShare(result.value);
    if (!opened.ok) {
      setError(opened.message);
      return;
    }
    props.onOpened(result.value.title);
    props.onClose();
  };

  const remove = async (share: ShareSummary) => {
    setError("");
    setNote("");
    setBusyId(share.id);
    const result = await deleteShare(share.id);
    if (!mounted.current) {
      return;
    }
    setBusyId(null);
    setConfirming(null);
    if (!result.ok) {
      if (!result.aborted) {
        setError(result.message);
      }
      return;
    }
    await load();
  };

  return (
    <Modal titleId="kf-mine-title" onClose={props.onClose}>
      <h2 id="kf-mine-title">My diagrams</h2>
      {shares === null && !loadError && <p role="status">Loading…</p>}
      {loadError && (
        <div className="kf-modal__row">
          <button type="button" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {shares && shares.length === 0 && <p>Nothing shared yet.</p>}
      {shares && shares.length > 0 && (
        <ul className="kf-list">
          {shares.map((share) => (
            <li key={share.id}>
              <div className="kf-list__head">
                <strong>{share.title}</strong>
                <span>{when(share.createdAt)}</span>
              </div>
              {confirming === share.id ? (
                <div className="kf-modal__row">
                  <span>Remove this link? It stops working at once.</span>
                  <button
                    type="button"
                    disabled={busyId === share.id}
                    onClick={() => remove(share)}
                  >
                    Remove
                  </button>
                  <button type="button" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </div>
              ) : (
                <div className="kf-modal__row">
                  <button type="button" onClick={() => copy(share)}>
                    Copy link
                  </button>
                  <button
                    type="button"
                    disabled={busyId === share.id}
                    onClick={() => open(share)}
                  >
                    Open in editor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setConfirming(share.id);
                    }}
                  >
                    Remove link
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="kf-modal__error" role="alert">
        {error || loadError}
      </p>
      <p className="kf-modal__note" role="status">
        {note}
      </p>
      <div className="kf-modal__row">
        <button type="button" onClick={props.onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
};
