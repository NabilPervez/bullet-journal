import { useMemo, useState } from "react";
import { toISODate } from "../lib/dates";
import { ENTRY_TYPES } from "../lib/model";
import { bySoonest } from "../lib/ordering";
import { EntryRow } from "./EntryRow";
import { ProjectedRow } from "./ProjectedRow";
import { projectionsBetween } from "../lib/projection";

const DAYS_SHOWN = 7;

export function WeeklyLogPage({ entries, addEntry, toggleEntryDone, deleteEntry, updateEntry, onSchedule }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [openDay, setOpenDay] = useState(null);
  const [dayDraft, setDayDraft] = useState({ text: "", type: "task", time: "" });

  // Today, then the six days after it — not a calendar week. What matters is
  // what's coming, and the first row should be the day you're standing in.
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + weekOffset * DAYS_SHOWN);
    return Array.from({ length: DAYS_SHOWN }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  // Upcoming occurrences of repeating entries, across the seven days shown.
  const projections = useMemo(
    () => projectionsBetween(entries, toISODate(days[0]), toISODate(days[days.length - 1])),
    [entries, days]
  );

  function dayItems(date) {
    const iso = toISODate(date);
    const on = (e) =>
      (e.type === "event" && e.eventDate === iso) || ((e.type === "task" || e.type === "goal") && e.dueDate === iso);
    return [...entries.filter(on), ...projections.filter(on)].sort(bySoonest);
  }

  async function submitDay(date) {
    if (!dayDraft.text.trim()) return;
    const iso = toISODate(date);
    await addEntry(
      dayDraft.text.trim(),
      dayDraft.type,
      dayDraft.type === "event" ? { eventDate: iso, eventTime: dayDraft.time || null } : { dueDate: iso }
    );
    setDayDraft({ text: "", type: "task", time: "" });
    setOpenDay(null);
  }

  const span = `${days[0].toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${days[DAYS_SHOWN - 1].toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  const todayISO = toISODate(new Date());

  return (
    <section aria-label="Weekly Log" className="stack gap-5" style={{ maxWidth: 760 }}>
      <div className="row spread wrap gap-3">
        <div className="stack">
          <h2 className="title">Next seven days</h2>
          <p className="meta">{span}</p>
        </div>
        <div className="row gap-2">
          <button className="icon-btn" onClick={() => setWeekOffset((n) => n - 1)} aria-label="Previous seven days">‹</button>
          <button className="btn btn-ghost" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>Now</button>
          <button className="icon-btn" onClick={() => setWeekOffset((n) => n + 1)} aria-label="Next seven days">›</button>
        </div>
      </div>

      {/* One day per row, stacked. Seven side-by-side columns meant cramped
          tracks on a phone and a swipe to reach the end of the week. */}
      <div className="stack gap-3 stagger">
        {days.map((date, index) => {
          const iso = toISODate(date);
          const isToday = iso === todayISO;
          const isOpen = openDay === iso;
          const items = dayItems(date);

          return (
            <div key={iso} className="day-row" data-today={isToday ? "true" : "false"}>
              <div className="day-row-head">
                <div className="row gap-3" style={{ minWidth: 0 }}>
                  <div className="day-stamp">
                    <span className="day-stamp-num">{date.getDate()}</span>
                    <span className="day-stamp-wd">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
                  </div>
                  <div className="stack" style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-title)" }}>
                      {isToday ? "Today" : index === 1 && weekOffset === 0 ? "Tomorrow" : date.toLocaleDateString(undefined, { weekday: "long" })}
                    </span>
                    <span className="meta">
                      {date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                      {items.length > 0 ? ` · ${items.length}` : ""}
                    </span>
                  </div>
                </div>

                <button
                  className="icon-btn icon-btn-sm"
                  onClick={() => setOpenDay(isOpen ? null : iso)}
                  aria-label={`Add something on ${date.toLocaleDateString()}`}
                  aria-expanded={isOpen}
                >
                  {isOpen ? "✕" : "+"}
                </button>
              </div>

              <div className="stack gap-2" style={{ padding: "var(--s3)" }}>
                {isOpen && (
                  <div className="card stack gap-3">
                    <div className="row gap-2 wrap">
                      {["event", "task", "goal"].map((t) => (
                        <button
                          key={t}
                          className="chip"
                          data-type={t}
                          aria-pressed={dayDraft.type === t}
                          onClick={() => setDayDraft((d) => ({ ...d, type: t }))}
                        >
                          <span className="chip-glyph" aria-hidden="true">{ENTRY_TYPES[t].glyph}</span>
                          {ENTRY_TYPES[t].label}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input"
                      value={dayDraft.text}
                      onChange={(e) => setDayDraft((d) => ({ ...d, text: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && submitDay(date)}
                      placeholder="Add an item…"
                      aria-label="New item"
                    />
                    {dayDraft.type === "event" && (
                      <input
                        className="input"
                        type="time"
                        value={dayDraft.time}
                        onChange={(e) => setDayDraft((d) => ({ ...d, time: e.target.value }))}
                        aria-label="Time"
                      />
                    )}
                    <button className="btn btn-primary btn-block" onClick={() => submitDay(date)} disabled={!dayDraft.text.trim()}>
                      Add
                    </button>
                  </div>
                )}

                {items.length === 0 && !isOpen ? (
                  <p className="meta" style={{ padding: "var(--s1) 0" }}>Nothing yet</p>
                ) : (
                  <ul className="stack gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {items.map((entry) =>
                      entry.projected ? (
                        <ProjectedRow key={entry.id} entry={entry} />
                      ) : (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          onToggle={() => toggleEntryDone(entry)}
                          onDelete={() => deleteEntry(entry)}
                          onSave={(patch) => updateEntry(entry, patch)}
                          onSchedule={onSchedule}
                        />
                      )
                    )}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
