import { useEffect } from "react";
import { EntryComposer } from "./EntryComposer";
import { C, fontDisplay, fontMono } from "../theme";

// Capture, within reach. The inline composer lives at the top of a scrolling
// page — the hardest third of the screen to reach one-handed, and further away
// with every entry logged.
export function CaptureButton({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Log an entry"
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(var(--nav-height) + var(--safe-bottom) + 16px)",
        zIndex: 35,
        width: 56,
        height: 56,
        borderRadius: 28,
        border: "none",
        background: C.accent,
        color: C.paper,
        fontFamily: fontDisplay,
        fontSize: 26,
        lineHeight: 1,
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(27,27,24,0.28)",
      }}
    >
      +
    </button>
  );
}

export function CaptureSheet({ addEntry, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Log an entry"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(27,27,24,0.4)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        style={{
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          background: C.paper,
          borderRadius: "14px 14px 0 0",
          padding: "12px 12px calc(var(--safe-bottom) + 12px)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkFaint, margin: 0 }}>
            Rapid log
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ fontFamily: fontMono, fontSize: 16, minWidth: 44, minHeight: 44, border: "none", background: "none", color: C.inkSoft, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <EntryComposer
          addEntry={addEntry}
          onDone={onClose}
          autoFocus
          inputId="capture-entry"
          wrapperStyle={{ display: "flex", flexDirection: "column" }}
        />
      </div>
    </div>
  );
}
