// Share and My diagrams buttons, fixed over the editor.

import { useState } from "react";

import { MyDiagrams } from "./MyDiagrams";
import { ShareDialog } from "./ShareDialog";

export const EditorActions = (props: { onOpened: (title: string) => void }) => {
  const [open, setOpen] = useState<"share" | "mine" | null>(null);
  return (
    <>
      <div className="kf-actions">
        <button type="button" onClick={() => setOpen("share")}>
          Share
        </button>
        <button type="button" onClick={() => setOpen("mine")}>
          My diagrams
        </button>
      </div>
      {open === "share" && <ShareDialog onClose={() => setOpen(null)} />}
      {open === "mine" && (
        <MyDiagrams onClose={() => setOpen(null)} onOpened={props.onOpened} />
      )}
    </>
  );
};
