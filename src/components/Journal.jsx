import { EntryComposer } from "./EntryComposer";
import { EntryRow } from "./EntryRow";
import { countByType, ENTRY_TYPES } from "../lib/model";

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
  // Goals first — they are what the rest of the page is in service of.
  const ordered = [...entries].sort((a, b) => (a.type === "goal" ? 0 : 1) - (b.type === "goal" ? 0 : 1));
  const counts = countByType(entries);
  const open = entries.filter((e) => !e.done && (e.type === "task" || e.type === "goal")).length;

  return (
    <section aria-label="Bullet journal" className="stack gap-4">
      <div className="row spread wrap gap-3">
        <h2 className="title">Rapid Log</h2>
        <div className="row gap-2 wrap">
          {Object.entries(ENTRY_TYPES).map(([key, meta]) =>
            counts[key] ? (
              <span key={key} className="row gap-1" title={`${counts[key]} ${meta.label}`}>
                <span className="sticker sticker-sm sticker-static" data-type={key} aria-hidden="true">{meta.glyph}</span>
                <span className="meta">{counts[key]}</span>
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* On a phone the composer lives in the capture sheet instead, within
          reach of a thumb. */}
      {showComposer && <EntryComposer addEntry={addEntry} />}

      {open > 0 && <p className="eyebrow">{open} open</p>}

      <ul className="stack gap-2 stagger" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Journal entries">
        {entries.length === 0 && (
          <li className="empty">
            <p style={{ margin: 0, fontWeight: 600 }}>Nothing logged yet</p>
            <p className="meta" style={{ marginTop: "var(--s2)" }}>
              {showComposer ? "Use the box above to write the first thing down." : "Tap + to write the first thing down."}
            </p>
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
