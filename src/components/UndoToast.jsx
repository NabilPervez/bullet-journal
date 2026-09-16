import { useEffect, useState } from "react";
import { C, fontBody, fontMono } from "../theme";

const VISIBLE_MS = 5000;

// Sits above the bottom nav and its safe-area inset, so it is reachable by
// thumb and never lands under the home indicator.
export function UndoToast({ undo, onUndo, onDismiss }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!undo) return undefined;
    setNow(Date.now());
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [undo, onDismiss]);

  if (!undo) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      key={undo.at ?? now}
      className="undo-toast"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: "calc(100vw - 32px)",
        padding: "10px 12px 10px 16px",
        borderRadius: 10,
        background: C.ink,
        color: C.paper,
        boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
      }}
    >
      <span style={{ fontFamily: fontBody, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {undo.label}
      </span>
      <button
        onClick={onUndo}
        style={{
          fontFamily: fontMono,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          minHeight: 44,
          padding: "0 14px",
          borderRadius: 8,
          border: "none",
          background: "rgba(255,255,255,0.14)",
          color: C.paper,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Undo
      </button>
    </div>
  );
}
