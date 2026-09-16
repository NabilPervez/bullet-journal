import { useMemo } from "react";
import { EntryComposer } from "./EntryComposer";
import { EntryRow } from "./EntryRow";
import { countByType, ENTRY_TYPES } from "../lib/model";
import { groupForDay } from "../lib/ordering";
import { toISODate } from "../lib/dates";

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
  const today = toISODate(new Date());
  const { due, rest, dueCount } = useMemo(() => groupForDay(entries, today), [entries, today]);

  const counts = countByType(entries);
  const open = entries.filter((e) => !e.done && (e.type === "task" || e.type === "goal")).length;

  const rowProps = (entry) => ({
    key: entry.id,
    entry,
    onToggle: () => toggleEntryDone(entry),
    onDelete: () => deleteEntry(entry),
    onSave: (patch) => updateEntry(entry, patch),
    isDragging: draggingEntryId === entry.id,
    onStartDrag,
    onSchedule,
    showType: false,
  });

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

      {entries.length === 0 && (
        <div className="empty">
          <p style={{ margin: 0, fontWeight: 600 }}>Nothing logged yet</p>
          <p className="meta" style={{ marginTop: "var(--s2)" }}>
            {showComposer ? "Use the box above to write the first thing down." : "Tap + to write the first thing down."}
          </p>
        </div>
      )}

      {/* What's due today comes first, whatever else is in the journal. */}
      {dueCount > 0 && (
        <div className="stack gap-3">
          <div className="row spread gap-2">
            <p className="eyebrow" style={{ color: "var(--accent-ink)" }}>Due today</p>
            <span className="meta">{dueCount}</span>
          </div>
          {due.map((group) => (
            <TypeGroup key={group.type} group={group} rowProps={rowProps} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="stack gap-3">
          {dueCount > 0 && <p className="eyebrow">Everything else</p>}
          {dueCount === 0 && open > 0 && <p className="eyebrow">{open} open</p>}
          {rest.map((group) => (
            <TypeGroup key={group.type} group={group} rowProps={rowProps} />
          ))}
        </div>
      )}
    </section>
  );
}

// One kind of entry, soonest first. The heading carries the same sticker the
// rows do, so a bundle is recognisable without reading it.
function TypeGroup({ group, rowProps }) {
  return (
    <div className="stack gap-2">
      <div className="row gap-2">
        <span className="sticker sticker-sm sticker-static" data-type={group.type} aria-hidden="true">{group.glyph}</span>
        <h3 className="eyebrow">{group.label}s</h3>
        <span className="meta">{group.items.length}</span>
      </div>
      <ul
        className="stack gap-2 stagger"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
        aria-label={`${group.label} entries`}
      >
        {group.items.map((entry) => (
          <EntryRow {...rowProps(entry)} />
        ))}
      </ul>
    </div>
  );
}
