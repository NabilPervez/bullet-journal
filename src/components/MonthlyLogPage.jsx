import { useState } from "react";
import { ENTRY_TYPES } from "../lib/model";
import { daysInMonthCount, formatDateShort, formatTimeShort, getMonthInfo, isoFor, monthLabelFromKey } from "../lib/dates";
import { C, fieldInputStyle, fontBody, fontDisplay, fontMono, navBtnStyle } from "../theme";

export function MonthlyLogPage({ entries, addEntry, toggleEntryDone, deleteEntry, monthOffset, setMonthOffset }) {
  const info = getMonthInfo(monthOffset);
  const numDays = daysInMonthCount(info.year, info.monthIndex);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const isCurrentMonth = monthOffset === 0;
  const todayNum = isCurrentMonth ? new Date().getDate() : -1;

  const [openDay, setOpenDay] = useState(null);
  const [dayDraft, setDayDraft] = useState({ text: "", type: "event", time: "" });
  const [dumpText, setDumpText] = useState("");

  function dayItems(day) {
    const iso = isoFor(info.year, info.monthIndex, day);
    return entries.filter((e) => (e.type === "event" && e.eventDate === iso) || ((e.type === "task" || e.type === "goal") && e.dueDate === iso));
  }

  const brainDump = entries.filter((e) => (e.type === "task" || e.type === "goal") && !e.done && (!e.dueDate || e.dueDate.startsWith(info.key)));

  async function submitDay(day) {
    if (!dayDraft.text.trim()) return;
    const iso = isoFor(info.year, info.monthIndex, day);
    await addEntry(dayDraft.text.trim(), dayDraft.type, dayDraft.type === "event" ? { eventDate: iso, eventTime: dayDraft.time || null } : { dueDate: iso });
    setDayDraft({ text: "", type: "event", time: "" });
    setOpenDay(null);
  }

  async function submitDump() {
    if (!dumpText.trim()) return;
    await addEntry(dumpText.trim(), "task", {});
    setDumpText("");
  }

  return (
    <section aria-label="Monthly Log">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>{info.label}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setMonthOffset((n) => n - 1)} aria-label="Previous month" style={navBtnStyle}>‹</button>
          <button
            onClick={() => setMonthOffset(0)}
            aria-label="Go to current month"
            disabled={isCurrentMonth}
            style={{ ...navBtnStyle, width: "auto", padding: "0 10px", opacity: isCurrentMonth ? 0.35 : 1, cursor: isCurrentMonth ? "default" : "pointer" }}
          >
            Today
          </button>
          <button onClick={() => setMonthOffset((n) => n + 1)} aria-label="Next month" style={navBtnStyle}>›</button>
        </div>
      </div>

      <div className="marginalia-monthly">
        {/* Left: days down the margin */}
        <div style={{ border: `1px solid ${C.rule}`, borderRadius: 8, background: "rgba(255,255,255,0.4)", overflow: "hidden" }}>
          {days.map((day) => {
            const weekday = new Date(info.year, info.monthIndex, day).toLocaleDateString(undefined, { weekday: "short" });
            const items = dayItems(day);
            const isToday = day === todayNum;
            const isOpen = openDay === day;
            return (
              <div key={day} style={{ borderBottom: `1px solid ${C.rule}`, background: isToday ? "rgba(38,54,92,0.05)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px" }}>
                  <div style={{ width: 40, flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, color: isToday ? C.accent : C.ink }}>{day}</div>
                    <div style={{ fontFamily: fontMono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase" }}>{weekday}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {items.length === 0 ? (
                      <div style={{ height: 22 }} />
                    ) : (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        {items.map((e) => (
                          <li key={e.id} style={{ fontFamily: fontBody, fontSize: 13, color: C.ink, display: "flex", gap: 5 }}>
                            <span style={{ color: C.inkFaint }}>{ENTRY_TYPES[e.type].glyph}</span>
                            <span>{e.text}</span>
                            {e.type === "event" && e.eventTime && (
                              <span style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint }}>{formatTimeShort(e.eventTime)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => setOpenDay(isOpen ? null : day)}
                    aria-label={`Add item on ${monthLabelFromKey(info.key)} ${day}`}
                    aria-expanded={isOpen}
                    style={{ fontFamily: fontMono, fontSize: 13, color: C.inkFaint, background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: "0 2px" }}
                  >
                    {isOpen ? "×" : "+"}
                  </button>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 12px 12px 62px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["event", "task", "goal"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setDayDraft((d) => ({ ...d, type: t }))}
                          aria-pressed={dayDraft.type === t}
                          style={{
                            fontFamily: fontMono,
                            fontSize: 10,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid ${dayDraft.type === t ? C.ink : C.rule}`,
                            background: dayDraft.type === t ? C.ink : "transparent",
                            color: dayDraft.type === t ? C.paper : C.inkSoft,
                            cursor: "pointer",
                          }}
                        >
                          {ENTRY_TYPES[t].glyph} {ENTRY_TYPES[t].label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={dayDraft.text}
                      onChange={(e) => setDayDraft((d) => ({ ...d, text: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && submitDay(day)}
                      placeholder="What's happening?"
                      style={{ ...fieldInputStyle, width: 160 }}
                    />
                    {dayDraft.type === "event" && (
                      <input
                        type="time"
                        value={dayDraft.time}
                        onChange={(e) => setDayDraft((d) => ({ ...d, time: e.target.value }))}
                        style={{ ...fieldInputStyle, width: 110 }}
                      />
                    )}
                    <button
                      onClick={() => submitDay(day)}
                      disabled={!dayDraft.text.trim()}
                      style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", padding: "6px 10px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer", opacity: dayDraft.text.trim() ? 1 : 0.4 }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: brain dump */}
        <div>
          <p style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint, margin: "0 0 8px" }}>
            Brain dump — {info.label}
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <input
              value={dumpText}
              onChange={(e) => setDumpText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitDump()}
              placeholder="Anything to tackle this month…"
              style={{ ...fieldInputStyle, flex: 1 }}
            />
            <button
              onClick={submitDump}
              disabled={!dumpText.trim()}
              style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", padding: "6px 12px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer", opacity: dumpText.trim() ? 1 : 0.4, flexShrink: 0 }}
            >
              Add
            </button>
          </div>
          {brainDump.length === 0 ? (
            <p style={{ fontFamily: fontBody, fontSize: 13, color: C.inkFaint, fontStyle: "italic", padding: "20px 0", textAlign: "center", border: `1px dashed ${C.rule}`, borderRadius: 8 }}>
              No open tasks for this month.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {brainDump.map((e) => (
                <li key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6 }}>
                  <button
                    onClick={() => toggleEntryDone(e)}
                    aria-label="Mark task done"
                    style={{ fontFamily: fontDisplay, fontSize: 14, width: 18, color: C.inkSoft, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                  >
                    •
                  </button>
                  <span style={{ fontFamily: fontBody, fontSize: 13.5, flex: 1, color: C.ink }}>{e.text}</span>
                  {e.dueDate && <span style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, flexShrink: 0 }}>{formatDateShort(e.dueDate)}</span>}
                  <button
                    onClick={() => deleteEntry(e)}
                    aria-label={`Delete task: ${e.text}`}
                    style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
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
