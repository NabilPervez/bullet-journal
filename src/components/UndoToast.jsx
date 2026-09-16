import { useEffect } from "react";

const VISIBLE_MS = 5000;

// Above the nav and the capture button, so it never lands under either.
export function UndoToast({ undo, onUndo, onDismiss }) {
  useEffect(() => {
    if (!undo) return undefined;
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [undo, onDismiss]);

  if (!undo) return null;

  return (
    <div role="status" aria-live="polite" className="toast" key={undo.at}>
      <span className="grow" style={{ fontSize: "var(--fs-meta)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {undo.label}
      </span>
      <button className="btn btn-primary" onClick={onUndo}>Undo</button>
    </div>
  );
}
