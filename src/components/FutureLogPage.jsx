import { useState, useMemo } from "react";
import { ENTRY_TYPES, entryRelevantDate } from "../lib/model";
import { formatDateShort, getMonthInfo } from "../lib/dates";
import { C, fieldInputStyle, fieldLabelStyle, fontBody, fontDisplay, fontMono } from "../theme";

export function FutureLogPage({ entries, addEntry }) {
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => getMonthInfo(i)), []);
  const [text, setText] = useState("");
  const [type, setType] = useState("task");
  const [date, setDate] = useState("");
  const canAdd = text.trim() && date;

  async function handleAdd() {
    if (!canAdd) return;
    await addEntry(text.trim(), type, type === "event" ? { eventDate: date } : { dueDate: date });
    setText("");
    setDate("");
  }

  function itemsForMonth(key) {
    return entries
      .filter((e) => (e.type === "task" || e.type === "goal" || e.type === "event") && entryRelevantDate(e).startsWith(key))
      .sort((a, b) => entryRelevantDate(a).localeCompare(entryRelevantDate(b)));
  }

  return (
    <section aria-label="Future Log">
      <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: "0 0 4px" }}>Future Log</h2>
      <p style={{ fontFamily: fontMono, fontSize: 11, color: C.inkFaint, margin: "0 0 16px" }}>
        The next twelve months, at a glance.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 12, background: "rgba(255,255,255,0.35)", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(ENTRY_TYPES)
            .filter(([k]) => k !== "note")
            .map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                aria-pressed={type === key}
                style={{
                  fontFamily: fontMono,
                  fontSize: 11,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${type === key ? C.ink : C.rule}`,
                  background: type === key ? C.ink : "transparent",
                  color: type === key ? C.paper : C.inkSoft,
                  cursor: "pointer",
                }}
              >
                {meta.glyph} {meta.label}
              </button>
            ))}
        </div>
        <div>
          <label style={fieldLabelStyle}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...fieldInputStyle, width: 160 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={fieldLabelStyle}>What's coming up?</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={fieldInputStyle}
            placeholder="Renew passport…"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", padding: "7px 16px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: canAdd ? "pointer" : "not-allowed", opacity: canAdd ? 1 : 0.4 }}
        >
          Add
        </button>
      </div>

      <div className="marginalia-future-grid">
        {months.map((m) => {
          const items = itemsForMonth(m.key);
          return (
            <div key={m.key} style={{ border: `1px solid ${C.rule}`, borderRadius: 8, padding: 12, background: "rgba(255,255,255,0.4)" }}>
              <p style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkSoft, margin: "0 0 8px" }}>{m.label}</p>
              {items.length === 0 ? (
                <p style={{ fontFamily: fontBody, fontSize: 12, color: C.inkFaint, fontStyle: "italic", margin: 0 }}>Nothing yet</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {items.map((e) => (
                    <li key={e.id} style={{ fontFamily: fontBody, fontSize: 12.5, color: C.ink, display: "flex", gap: 5 }}>
                      <span style={{ color: C.inkFaint, flexShrink: 0 }}>{ENTRY_TYPES[e.type].glyph}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.text}
                        <span style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint }}> · {formatDateShort(entryRelevantDate(e))}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
