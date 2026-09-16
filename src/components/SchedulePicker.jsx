import { useEffect, useMemo, useRef, useState } from "react";
import { SLOTS_PER_DAY, SLOT_MINUTES } from "../lib/constants";
import { minutesToLabel, toISODate } from "../lib/dates";
import { C, fontBody, fontDisplay, fontMono } from "../theme";

// The keyboard and touch route onto the calendar. Dragging is one way to
// schedule something; it can't be the only way.
export function SchedulePicker({ entry, blocks, onPick, onClose }) {
  const [dayOffset, setDayOffset] = useState(0);
  const closeRef = useRef(null);

  const date = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const dateStr = toISODate(date);
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const taken = useMemo(() => {
    const map = new Map();
    for (const b of blocks) {
      if (b.date !== dateStr) continue;
      const first = b.startMinute / SLOT_MINUTES;
      const span = Math.max(1, Math.round(b.durationMinutes / SLOT_MINUTES));
      for (let i = 0; i < span; i += 1) map.set(first + i, b.entryId);
    }
    return map;
  }, [blocks, dateStr]);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule ${entry.text}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(27,27,24,0.4)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          background: C.paper,
          borderRadius: "14px 14px 0 0",
          paddingBottom: "var(--safe-bottom)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint, margin: 0 }}>
                Schedule
              </p>
              <p style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.text}
              </p>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              style={{ fontFamily: fontMono, fontSize: 16, minWidth: 44, minHeight: 44, border: "none", background: "none", color: C.inkSoft, cursor: "pointer", flexShrink: 0 }}
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setDayOffset((n) => n - 1)}
              aria-label="Previous day"
              style={dayNavStyle}
            >
              ‹
            </button>
            <span style={{ flex: 1, textAlign: "center", fontFamily: fontBody, fontSize: 15 }}>{dayLabel}</span>
            <button
              onClick={() => setDayOffset((n) => n + 1)}
              aria-label="Next day"
              style={dayNavStyle}
            >
              ›
            </button>
          </div>
        </div>

        <ul
          aria-label="Available times"
          style={{ listStyle: "none", margin: 0, padding: 8, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 6 }}
        >
          {Array.from({ length: SLOTS_PER_DAY }, (_, i) => i).map((slotIndex) => {
            const startMinute = slotIndex * SLOT_MINUTES;
            const occupiedBy = taken.get(slotIndex);
            const isOwn = occupiedBy === entry.id;
            const busy = Boolean(occupiedBy) && !isOwn;
            return (
              <li key={slotIndex}>
                <button
                  onClick={() => onPick(dateStr, startMinute)}
                  aria-label={`${minutesToLabel(startMinute)}${busy ? ", already booked" : ""}`}
                  style={{
                    width: "100%",
                    minHeight: 44,
                    fontFamily: fontMono,
                    fontSize: 13,
                    borderRadius: 8,
                    border: `1px solid ${isOwn ? C.accent : C.rule}`,
                    background: isOwn ? C.accent : busy ? C.paperDim : "rgba(255,255,255,0.6)",
                    color: isOwn ? C.paper : busy ? C.inkFaint : C.ink,
                    cursor: "pointer",
                  }}
                >
                  {minutesToLabel(startMinute)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const dayNavStyle = {
  fontFamily: fontMono,
  fontSize: 15,
  minWidth: 44,
  minHeight: 44,
  borderRadius: 8,
  border: `1px solid ${C.rule}`,
  background: C.paperDim,
  color: C.inkSoft,
  cursor: "pointer",
};
