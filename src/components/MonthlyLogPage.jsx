import { useState } from "react";
import { daysInMonthCount, formatDateShort, formatTimeShort, getMonthInfo, isoFor } from "../lib/dates";
import { ENTRY_TYPES } from "../lib/model";
import { projectionsBetween } from "../lib/projection";
import { describeRepeat } from "../lib/recurrence";

export function MonthlyLogPage({ entries, addEntry, toggleEntryDone, deleteEntry, monthOffset, setMonthOffset }) {
  const info = getMonthInfo(monthOffset);
  const numDays = daysInMonthCount(info.year, info.monthIndex);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const isCurrentMonth = monthOffset === 0;
  const todayNum = isCurrentMonth ? new Date().getDate() : -1;

  const [openDay, setOpenDay] = useState(null);
  const [dayDraft, setDayDraft] = useState({ text: "", type: "event", time: "" });
  const [dumpText, setDumpText] = useState("");

  // Where repeating entries will land this month, shown alongside the real
  // ones so a monthly cadence is visible before it happens.
  const monthStart = isoFor(info.year, info.monthIndex, 1);
  const monthEnd = isoFor(info.year, info.monthIndex, numDays);
  const projections = projectionsBetween(entries, monthStart, monthEnd);

  function dayItems(day) {
    const iso = isoFor(info.year, info.monthIndex, day);
    const on = (e) =>
      (e.type === "event" && e.eventDate === iso) || ((e.type === "task" || e.type === "goal") && e.dueDate === iso);
    return [...entries.filter(on), ...projections.filter(on)];
  }

  const brainDump = entries.filter(
    (e) => (e.type === "task" || e.type === "goal") && !e.done && (!e.dueDate || e.dueDate.startsWith(info.key))
  );

  async function submitDay(day) {
    if (!dayDraft.text.trim()) return;
    const iso = isoFor(info.year, info.monthIndex, day);
    await addEntry(
      dayDraft.text.trim(),
      dayDraft.type,
      dayDraft.type === "event" ? { eventDate: iso, eventTime: dayDraft.time || null } : { dueDate: iso }
    );
    setDayDraft({ text: "", type: "event", time: "" });
    setOpenDay(null);
  }

  async function submitDump() {
    if (!dumpText.trim()) return;
    await addEntry(dumpText.trim(), "task", {});
    setDumpText("");
  }

  return (
    <section aria-label="Monthly Log" className="stack gap-5">
      <div className="row spread wrap gap-3">
        <h2 className="title">{info.label}</h2>
        <div className="row gap-2">
          <button className="icon-btn" onClick={() => setMonthOffset((n) => n - 1)} aria-label="Previous month">‹</button>
          <button className="btn btn-ghost" onClick={() => setMonthOffset(0)} disabled={isCurrentMonth}>This month</button>
          <button className="icon-btn" onClick={() => setMonthOffset((n) => n + 1)} aria-label="Next month">›</button>
        </div>
      </div>

      <div className="grid-monthly">
        {/* Days down the margin, each one a stamp. */}
        <div className="month-list">
          {days.map((day) => {
            const weekday = new Date(info.year, info.monthIndex, day).toLocaleDateString(undefined, { weekday: "short" });
            const items = dayItems(day);
            const isToday = day === todayNum;
            const isOpen = openDay === day;

            return (
              <div key={day} data-today={isToday ? "true" : "false"} className="stack">
                <div className="month-day" data-today={isToday ? "true" : "false"}>
                  <div className="day-stamp">
                    <span className="day-stamp-num">{day}</span>
                    <span className="day-stamp-wd">{weekday}</span>
                  </div>

                  <div className="grow stack gap-1" style={{ paddingTop: 2 }}>
                    {items.length === 0 ? (
                      <span className="meta" style={{ opacity: 0.5 }}>—</span>
                    ) : (
                      items.map((e) => (
                        <div key={e.id} className="row gap-2" style={{ alignItems: "baseline", opacity: e.projected ? 0.65 : 1 }}>
                          <span className="sticker sticker-sm sticker-static" data-type={e.type} aria-hidden="true">
                            {ENTRY_TYPES[e.type].glyph}
                          </span>
                          <span className="grow" style={{ fontSize: "var(--fs-body)", overflowWrap: "anywhere" }}>{e.text}</span>
                          {e.projected && (
                            <span className="ticket" style={{ color: "var(--accent-ink)" }} title={`Repeats ${describeRepeat(e.repeat).toLowerCase()}`}>↻</span>
                          )}
                          {e.type === "event" && e.eventTime && <span className="ticket">{formatTimeShort(e.eventTime)}</span>}
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    className="icon-btn icon-btn-sm"
                    onClick={() => setOpenDay(isOpen ? null : day)}
                    aria-label={`Add something on ${info.label} ${day}`}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? "✕" : "+"}
                  </button>
                </div>

                {isOpen && (
                  <div className="card stack gap-3" style={{ margin: "0 var(--s3) var(--s3)" }}>
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
                      onKeyDown={(e) => e.key === "Enter" && submitDay(day)}
                      placeholder="What's happening?"
                      aria-label={`What's happening on ${info.label} ${day}?`}
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

                    <button className="btn btn-primary btn-block" onClick={() => submitDay(day)} disabled={!dayDraft.text.trim()}>
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Brain dump */}
        <div className="stack gap-3">
          <p className="eyebrow">Brain dump — {info.label}</p>

          <div className="row gap-2">
            <input
              className="input grow"
              value={dumpText}
              onChange={(e) => setDumpText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitDump()}
              placeholder="Anything to tackle this month…"
              aria-label="Add to this month's brain dump"
            />
            <button className="btn btn-primary" onClick={submitDump} disabled={!dumpText.trim()}>Add</button>
          </div>

          {brainDump.length === 0 ? (
            <p className="empty">No open tasks for this month.</p>
          ) : (
            <ul className="stack gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {brainDump.map((e) => (
                <li key={e.id} className="row gap-3" style={{ padding: "var(--s1) 0" }}>
                  <button
                    className="sticker"
                    data-type={e.type}
                    onClick={() => toggleEntryDone(e)}
                    aria-label={`Mark "${e.text}" as done`}
                  >
                    {ENTRY_TYPES[e.type].glyph}
                  </button>
                  <span className="grow" style={{ overflowWrap: "anywhere" }}>{e.text}</span>
                  {e.dueDate && <span className="ticket">{formatDateShort(e.dueDate)}</span>}
                  <button
                    className="icon-btn icon-btn-sm icon-btn-danger"
                    onClick={() => deleteEntry(e)}
                    aria-label={`Delete "${e.text}"`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
