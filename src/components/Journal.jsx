import { useState } from "react";
import { ENTRY_TYPES, SIGNIFIERS } from "../lib/model";
import { C, fieldInputStyle, fieldLabelStyle, fontBody, fontDisplay, fontMono } from "../theme";
import { EntryRow } from "../components/EntryRow";

export function Journal({ entries, addEntry, toggleEntryDone, deleteEntry, updateEntry, dragEntryId, setDragEntryId }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("task");
  const [signifier, setSignifier] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const canSubmit = text.trim() && (type !== "event" || eventDate);

  function resetForm() {
    setText("");
    setSignifier("none");
    setDueDate("");
    setEventDate("");
    setEventTime("");
    setEventLocation("");
  }

  async function handleLogEntry() {
    if (!canSubmit) return;
    await addEntry(text.trim(), type, {
      signifier: signifier === "none" ? null : signifier,
      dueDate: type === "task" && dueDate ? dueDate : null,
      eventDate: type === "event" ? eventDate : null,
      eventTime: type === "event" ? eventTime : null,
      eventLocation: type === "event" ? eventLocation : null,
    });
    resetForm();
  }

  return (
    <section aria-label="Bullet journal">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>Rapid Log</h2>
        <span style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint }}>
          {entries.length} entries
        </span>
      </div>

      <div style={{ marginBottom: 24, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 12, background: "rgba(255,255,255,0.35)" }}>
        <div role="radiogroup" aria-label="Entry type" style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {Object.entries(ENTRY_TYPES).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              role="radio"
              aria-checked={type === key}
              onClick={() => setType(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: fontMono,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${type === key ? C.ink : C.rule}`,
                background: type === key ? C.ink : "transparent",
                color: type === key ? C.paper : C.inkSoft,
                cursor: "pointer",
              }}
            >
              <span aria-hidden="true">{meta.glyph}</span>
              {meta.label}
            </button>
          ))}

          <span style={{ width: 1, background: C.rule, margin: "0 2px" }} />

          {Object.entries(SIGNIFIERS).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              onClick={() => setSignifier(key)}
              aria-pressed={signifier === key}
              title={meta.label}
              aria-label={`Signifier: ${meta.label}`}
              style={{
                fontFamily: fontMono,
                fontSize: 11,
                width: 26,
                padding: "4px 0",
                borderRadius: 999,
                border: `1px solid ${signifier === key ? C.accent : C.rule}`,
                background: signifier === key ? C.accent : "transparent",
                color: signifier === key ? C.paper : C.inkSoft,
                cursor: "pointer",
              }}
            >
              {meta.char || "–"}
            </button>
          ))}
        </div>

        {type === "event" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={fieldLabelStyle} htmlFor="event-date">Date *</label>
              <input id="event-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={fieldInputStyle} required />
            </div>
            <div>
              <label style={fieldLabelStyle} htmlFor="event-time">Time</label>
              <input id="event-time" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={fieldInputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={fieldLabelStyle} htmlFor="event-location">Location</label>
              <input id="event-location" type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Where?" style={fieldInputStyle} />
            </div>
          </div>
        )}

        {(type === "task" || type === "goal") && (
          <div style={{ marginBottom: 10, maxWidth: 200 }}>
            <label style={fieldLabelStyle} htmlFor="due-date">Due date (optional)</label>
            <input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={fieldInputStyle} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <label htmlFor="new-entry" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            New journal entry
          </label>
          <input
            id="new-entry"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogEntry();
            }}
            placeholder="Capture a thought…"
            style={{ ...fieldInputStyle, flex: 1, fontSize: 14, padding: "8px 12px" }}
          />
          <button
            type="button"
            onClick={handleLogEntry}
            disabled={!canSubmit}
            style={{
              fontFamily: fontMono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: C.accent,
              color: C.paper,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.4,
              flexShrink: 0,
            }}
          >
            Log
          </button>
        </div>
        {type === "event" && !eventDate && (
          <p style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, margin: "6px 0 0" }}>Events need a date.</p>
        )}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }} aria-label="Journal entries">
        {entries.length === 0 && (
          <li style={{ fontFamily: fontBody, fontSize: 13, color: C.inkFaint, fontStyle: "italic", padding: "24px 0", textAlign: "center", border: `1px dashed ${C.rule}`, borderRadius: 8 }}>
            The page is blank. Write down what's on your mind.
          </li>
        )}
        {[...entries].sort((a,b) => (a.type==='goal'?0:1) - (b.type==='goal'?0:1)).map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onToggle={() => toggleEntryDone(entry)}
            onDelete={() => deleteEntry(entry)}
            onSave={(patch) => updateEntry(entry, patch)}
            isDragging={dragEntryId === entry.id}
            onDragStart={() => setDragEntryId(entry.id)}
            onDragEnd={() => setDragEntryId(null)}
          />
        ))}
      </ul>
    </section>
  );
}
