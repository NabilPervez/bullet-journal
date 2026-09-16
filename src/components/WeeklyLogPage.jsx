import { useMemo, useState } from "react";
import { toISODate } from "../lib/dates";
import { ENTRY_TYPES } from "../lib/model";
import { EntryRow } from "./EntryRow";

export function WeeklyLogPage({ entries, addEntry, toggleEntryDone, deleteEntry, updateEntry, onSchedule }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [openDay, setOpenDay] = useState(null);
  const [dayDraft, setDayDraft] = useState({ text: "", type: "task", time: "" });

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + weekOffset * 7);
    // Note: a rolling five-day window centred on today. A true Mon–Sun week
    // is the next ticket; this is layout work only.
    return [-2, -1, 0, 1, 2].map((offset) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d;
    });
  }, [weekOffset]);

  function dayItems(date) {
    const iso = toISODate(date);
    return [...entries]
      .filter((e) => (e.type === "event" && e.eventDate === iso) || ((e.type === "task" || e.type === "goal") && e.dueDate === iso))
      .sort((a, b) => (a.type === "goal" ? 0 : 1) - (b.type === "goal" ? 0 : 1));
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

  const span = `${days[0].toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${days[4].toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  return (
    <section aria-label="Weekly Log" className="stack gap-5">
      <div className="row spread wrap gap-3">
        <div className="stack">
          <h2 className="title">Five days</h2>
          <p className="meta">{span}</p>
        </div>
        <div className="row gap-2">
          <button className="icon-btn" onClick={() => setWeekOffset((n) => n - 1)} aria-label="Previous week">‹</button>
          <button className="btn btn-ghost" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>Now</button>
          <button className="icon-btn" onClick={() => setWeekOffset((n) => n + 1)} aria-label="Next week">›</button>
        </div>
      </div>

      <div className="week-pager">
        {days.map((date) => {
          const iso = toISODate(date);
          const isToday = iso === toISODate(new Date());
          const isOpen = openDay === iso;
          const items = dayItems(date);

          return (
            <div key={iso} className="week-day" data-today={isToday ? "true" : "false"}>
              <div className="week-day-head">
                <div className="stack">
                  <span className="eyebrow" style={{ color: isToday ? "var(--accent-ink)" : undefined }}>
                    {date.toLocaleDateString(undefined, { weekday: "long" })}
                  </span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-title)" }}>
                    {date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
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

              <div className="grow stack gap-2" style={{ padding: "var(--s3)" }}>
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

                <ul className="stack gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {items.length === 0 && !isOpen && <li className="meta" style={{ textAlign: "center", padding: "var(--s5) 0" }}>Empty</li>}
                  {items.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onToggle={() => toggleEntryDone(entry)}
                      onDelete={() => deleteEntry(entry)}
                      onSave={(patch) => updateEntry(entry, patch)}
                      onSchedule={onSchedule}
                    />
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
