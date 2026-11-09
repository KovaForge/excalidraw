// A small accessible modal: labelled dialog, focus moves in and is restored, Escape closes, Tab stays inside.

import { useEffect, useRef } from "react";

import type { ReactNode } from "react";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export const Modal = (props: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const onClose = useRef(props.onClose);
  onClose.current = props.onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? box.current)?.focus();
    return () => {
      before?.focus?.();
    };
  }, []);

  return (
    <div className="kf-modal-backdrop">
      <div
        ref={box}
        className="kf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          // the editor listens for keys on the whole page: keep ours to ourselves
          event.nativeEvent.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onClose.current();
          } else if (event.key === "Tab") {
            const items = [
              ...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
            ];
            if (!items.length) {
              return;
            }
            const last = items[items.length - 1];
            const head = items[0];
            if (event.shiftKey && document.activeElement === head) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              head.focus();
            }
          }
        }}
      >
        {props.children}
      </div>
    </div>
  );
};
