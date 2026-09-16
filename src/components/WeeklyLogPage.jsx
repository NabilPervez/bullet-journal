import { useState, useMemo } from "react";
import { useIsCompact } from "../hooks/useViewport";
import { ENTRY_TYPES } from "../lib/model";
import { toISODate } from "../lib/dates";
import { C, fieldInputStyle, fontBody, fontDisplay, fontMono, navBtnStyle } from "../theme";
import { EntryRow } from "../components/EntryRow";

export function WeeklyLogPage({ entries, addEntry, toggleEntryDone, deleteEntry, updateEntry, onSchedule }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const compact = useIsCompact();

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + (weekOffset * 7));
    
    // Create [Today-2, Today-1, Today, Today+1, Today+2]
    return [-2, -1, 0, 1, 2].map(offset => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d;
    });
  }, [weekOffset]);

  const [openDay, setOpenDay] = useState(null);
  const [dayDraft, setDayDraft] = useState({ text: "", type: "task", time: "" });

  function dayItems(date) {
    const iso = toISODate(date);
    return [...entries].filter((e) => (e.type === "event" && e.eventDate === iso) || ((e.type === "task" || e.type === "goal") && e.dueDate === iso))
      .sort((a, b) => (a.type === 'goal' ? 0 : 1) - (b.type === 'goal' ? 0 : 1));
  }

  async function submitDay(date) {
    if (!dayDraft.text.trim()) return;
    const iso = toISODate(date);
    await addEntry(dayDraft.text.trim(), dayDraft.type, dayDraft.type === "event" ? { eventDate: iso, eventTime: dayDraft.time || null } : { dueDate: iso });
    setDayDraft({ text: "", type: "task", time: "" });
    setOpenDay(null);
  }

  return (
    <section aria-label="Weekly Log">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>
          Week of {days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {days[4].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setWeekOffset((n) => n - 1)} aria-label="Previous week" style={navBtnStyle}>‹</button>
          <button
            onClick={() => setWeekOffset(0)}
            aria-label="Go to this week"
            disabled={weekOffset === 0}
            style={{ ...navBtnStyle, width: "auto", padding: "0 10px", opacity: weekOffset === 0 ? 0.35 : 1, cursor: weekOffset === 0 ? "default" : "pointer" }}
          >
            Current
          </button>
          <button onClick={() => setWeekOffset((n) => n + 1)} aria-label="Next week" style={navBtnStyle}>›</button>
        </div>
      </div>

      <div
        className={compact ? "week-pager" : undefined}
        style={
          compact
            ? { display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", margin: "0 -16px", padding: "0 16px 8px" }
            : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }
        }
      >
        {days.map((date) => {
          const iso = toISODate(date);
          const isToday = iso === toISODate(new Date());
          const isOpen = openDay === iso;
          const items = dayItems(date);
          
          return (
            <div
              key={iso}
              style={{
                border: `1px solid ${isToday ? C.accent : C.rule}`,
                borderRadius: 8,
                background: isToday ? "rgba(38,54,92,0.02)" : "rgba(255,255,255,0.4)",
                display: "flex",
                flexDirection: "column",
                minHeight: compact ? 240 : 300,
                ...(compact ? { flex: "0 0 82%", scrollSnapAlign: "start" } : null),
              }}
            >
              <div style={{ padding: "12px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", color: isToday ? C.accent : C.inkFaint }}>
                    {date.toLocaleDateString(undefined, { weekday: "long" })}
                  </div>
                  <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, color: isToday ? C.accent : C.ink }}>
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
                <button
                  onClick={() => setOpenDay(isOpen ? null : iso)}
                  style={{ fontFamily: fontMono, fontSize: 16, color: C.inkFaint, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
                >
                  {isOpen ? "×" : "+"}
                </button>
              </div>
              
              <div style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: 4 }}>
                {isOpen && (
                  <div style={{ padding: "8px", background: "rgba(255,255,255,0.6)", borderRadius: 6, border: `1px solid ${C.rule}`, marginBottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["event", "task", "goal"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setDayDraft((d) => ({ ...d, type: t }))}
                          style={{
                            fontFamily: fontMono, fontSize: 10, padding: "2px 6px", borderRadius: 999,
                            border: `1px solid ${dayDraft.type === t ? C.ink : C.rule}`,
                            background: dayDraft.type === t ? C.ink : "transparent",
                            color: dayDraft.type === t ? C.paper : C.inkSoft, cursor: "pointer"
                          }}
                        >
                          {ENTRY_TYPES[t].glyph}
                        </button>
                      ))}
                    </div>
                    <input
                      value={dayDraft.text}
                      onChange={(e) => setDayDraft((d) => ({ ...d, text: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && submitDay(date)}
                      placeholder="Add item..."
                      style={{ ...fieldInputStyle, padding: "4px 8px" }}
                    />
                    {dayDraft.type === "event" && (
                      <input
                        type="time"
                        value={dayDraft.time}
                        onChange={(e) => setDayDraft((d) => ({ ...d, time: e.target.value }))}
                        style={{ ...fieldInputStyle, padding: "4px 8px" }}
                      />
                    )}
                    <button
                      onClick={() => submitDay(date)}
                      disabled={!dayDraft.text.trim()}
                      style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", padding: "4px", borderRadius: 4, border: "none", background: C.accent, color: C.paper, cursor: "pointer", opacity: dayDraft.text.trim() ? 1 : 0.4 }}
                    >
                      Add
                    </button>
                  </div>
                )}
                
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  {items.length === 0 && !isOpen && (
                    <li style={{ fontFamily: fontBody, fontSize: 12, color: C.inkFaint, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>Empty</li>
                  )}
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
