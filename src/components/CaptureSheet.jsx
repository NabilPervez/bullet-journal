import { useEffect } from "react";
import { EntryComposer } from "./EntryComposer";

// Capture, within reach. The inline composer lives at the top of a scrolling
// page — the hardest part of the screen to reach one-handed, and further away
// with every entry logged.
export function CaptureButton({ onOpen }) {
  return (
    <button className="fab" onClick={onOpen} aria-label="Log an entry">+</button>
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
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Log an entry"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet-grip" aria-hidden="true" />
        <div className="row spread gap-2" style={{ marginBottom: "var(--s3)" }}>
          <p className="eyebrow">Rapid log</p>
          <button className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <EntryComposer addEntry={addEntry} onDone={onClose} autoFocus idPrefix="capture-entry" compact />
      </div>
    </div>
  );
}
