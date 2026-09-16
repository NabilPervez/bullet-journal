import { useRef, useState } from "react";
import { download, parseJSON, toJSON, toMarkdown } from "../lib/transfer";
import { C, fontBody, fontDisplay, fontMono } from "../theme";

const actionStyle = {
  fontFamily: fontMono,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 8,
  border: `1px solid ${C.rule}`,
  background: "rgba(255,255,255,0.6)",
  color: C.ink,
  cursor: "pointer",
};

export function JournalData({ entries, blocks, version, onImport }) {
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);

  const stamp = new Date().toISOString().slice(0, 10);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseJSON(String(reader.result));
      if (!parsed.ok) {
        setMessage({ tone: "bad", text: parsed.error });
        return;
      }
      const count = parsed.entries.length;
      // Import replaces the journal, so it asks first and says what it costs.
      const ok = window.confirm(
        `Import ${count} ${count === 1 ? "entry" : "entries"}?\n\nThis replaces the ${entries.length} currently in the journal. Export first if you want to keep them.`
      );
      if (!ok) return;
      onImport(parsed);
      setMessage({ tone: "good", text: `Imported ${count} ${count === 1 ? "entry" : "entries"}.` });
    };
    reader.onerror = () => setMessage({ tone: "bad", text: "That file couldn't be read." });
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <section aria-label="Journal data" style={{ marginTop: 32, borderTop: `1px solid ${C.rule}`, paddingTop: 20, maxWidth: 640 }}>
      <h3 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, margin: "0 0 4px" }}>Your journal</h3>
      <p style={{ fontFamily: fontBody, fontSize: 14, color: C.inkSoft, margin: "0 0 14px" }}>
        {entries.length} {entries.length === 1 ? "entry" : "entries"}, stored on this device only. Keep a copy somewhere else.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          onClick={() => download(`marginalia-${stamp}.json`, toJSON({ entries, blocks, version }), "application/json")}
          style={actionStyle}
        >
          Export JSON
        </button>
        <button
          onClick={() => download(`marginalia-${stamp}.md`, toMarkdown({ entries }), "text/markdown")}
          style={actionStyle}
        >
          Export Markdown
        </button>
        <button onClick={() => fileRef.current?.click()} style={actionStyle}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          id="import-journal"
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          style={{ display: "none" }}
        />
      </div>

      {message && (
        <p
          role="status"
          style={{ fontFamily: fontMono, fontSize: 12, margin: "12px 0 0", color: message.tone === "bad" ? C.critical : C.accent }}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
