import { EntryComposer } from "./EntryComposer";
import { EntryRow } from "./EntryRow";
import { C, fontBody, fontDisplay, fontMono } from "../theme";

export function Journal({
  entries,
  addEntry,
  toggleEntryDone,
  deleteEntry,
  updateEntry,
  draggingEntryId,
  onStartDrag,
  onSchedule,
  showComposer = true,
}) {
  // Goals first — they are the things the rest of the page is in service of.
  const ordered = [...entries].sort((a, b) => (a.type === "goal" ? 0 : 1) - (b.type === "goal" ? 0 : 1));

  return (
    <section aria-label="Bullet journal">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>Rapid Log</h2>
        <span style={{ fontFamily: fontMono, fontSize: "var(--fs-label)", textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint }}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* On a phone the composer lives in the capture sheet instead, within
          reach of a thumb. */}
      {showComposer && (
        <EntryComposer
          addEntry={addEntry}
          wrapperStyle={{ marginBottom: 24, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 12, background: "rgba(255,255,255,0.35)" }}
        />
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }} aria-label="Journal entries">
        {entries.length === 0 && (
          <li style={{ fontFamily: fontBody, fontSize: "var(--fs-body)", color: C.inkFaint, fontStyle: "italic", padding: "24px 0", textAlign: "center", border: `1px dashed ${C.rule}`, borderRadius: 8 }}>
            The page is blank. Write down what's on your mind.
          </li>
        )}
        {ordered.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onToggle={() => toggleEntryDone(entry)}
            onDelete={() => deleteEntry(entry)}
            onSave={(patch) => updateEntry(entry, patch)}
            isDragging={draggingEntryId === entry.id}
            onStartDrag={onStartDrag}
            onSchedule={onSchedule}
          />
        ))}
      </ul>
    </section>
  );
}
