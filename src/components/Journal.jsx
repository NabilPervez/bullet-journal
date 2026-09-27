import { useMemo } from "react";
import { EntryComposer } from "./EntryComposer";
import { EntryRow } from "./EntryRow";
import { countByType, ENTRY_TYPES } from "../lib/model";
import { groupForDay, HORIZONS } from "../lib/ordering";
import { formatDateShort, toISODate } from "../lib/dates";

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
  const { sections, completed } = useMemo(() => groupForDay(entries, today), [entries, today]);

  const counts = countByType(entries);

  const rowProps = (entry) => ({
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

      {entries.length > 0 && (
        <>
          {/* Every horizon keeps its place on the page; only Today says so
              when it is empty, because that is the one you look for. */}
          {sections.map((section) =>
            section.count > 0 || section.id === "today" ? (
              <HorizonSection key={section.id} section={section} today={today} rowProps={rowProps} />
            ) : null
          )}

          {completed.count > 0 && (
            <details className="horizon horizon-completed" open>
              <summary className="horizon-head">
                <span className="horizon-title">Completed</span>
                <span className="horizon-count">{completed.count}</span>
              </summary>
              <ul className="stack gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Completed entries">
                {completed.items.map((entry) => (
                  <EntryRow key={entry.id} {...rowProps(entry)} showType />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

// The dates a horizon covers, e.g. "Sep 28 – Oct 4", so "1 week out" is
// never a guess.
function horizonRange(id, today) {
  const index = HORIZONS.findIndex((h) => h.id === id);
  const from = index > 0 ? HORIZONS[index - 1].maxDays + 1 : 0;
  const to = HORIZONS[index].maxDays;
  const [y, m, d] = today.split("-").map(Number);
  const at = (n) => formatDateShort(toISODate(new Date(y, m - 1, d + n)));
  if (id === "today") return at(0);
  if (to === Infinity) return `${at(from)} on, or no date`;
  return `${at(from)} – ${at(to)}`;
}

function HorizonSection({ section, today, rowProps }) {
  const headingId = `horizon-${section.id}`;
  return (
    <section className="horizon" data-horizon={section.id} aria-labelledby={headingId}>
      <div className="horizon-head">
        <h3 id={headingId} className="horizon-title">{section.label}</h3>
        <span className="horizon-range">{horizonRange(section.id, today)}</span>
        <span className="horizon-count">{section.count}</span>
      </div>
      {section.count === 0 ? (
        <p className="meta">Nothing due today.</p>
      ) : (
        section.groups.map((group) => <TypeGroup key={group.type} group={group} rowProps={rowProps} />)
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
        <h4 className="eyebrow">{group.heading}</h4>
        <span className="meta">{group.items.length}</span>
      </div>
      <ul
        className="stack gap-2 stagger"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
        aria-label={`${group.label} entries`}
      >
        {group.items.map((entry) => (
          <EntryRow key={entry.id} {...rowProps(entry)} />
        ))}
      </ul>
    </div>
  );
}
