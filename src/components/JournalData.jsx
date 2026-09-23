import { useRef, useState } from "react";
import { download, parseJSON, toJSON, toMarkdown } from "../lib/transfer";

export function JournalData({ entries, blocks, version, onImport, onExported }) {
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
    <section aria-label="Journal data" className="panel stack gap-3">
      <div className="stack gap-1">
        <h3 style={{ fontSize: "var(--fs-title)" }}>Your journal</h3>
        <p className="meta">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}, on this device only. Keep a copy somewhere else.
        </p>
      </div>

      <div className="row gap-2 wrap">
        <button
          className="btn btn-secondary"
          onClick={() => {
            download(`marginalia-${stamp}.json`, toJSON({ entries, blocks, version }), "application/json");
            // Only JSON counts as a backup: it is the one format Import reads.
            onExported?.();
          }}
        >
          Export JSON
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => download(`marginalia-${stamp}.md`, toMarkdown({ entries }), "text/markdown")}
        >
          Export Markdown
        </button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Import JSON</button>
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
        <p role="status" className="meta" style={{ color: message.tone === "bad" ? "var(--danger)" : "var(--accent-ink)" }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
