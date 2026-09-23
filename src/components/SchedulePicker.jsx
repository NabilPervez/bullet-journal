import { useEffect, useMemo, useRef, useState } from "react";
import { SLOTS_PER_DAY, SLOT_MINUTES } from "../lib/constants";
import { minutesToLabel, toISODate } from "../lib/dates";
import { useToday } from "../hooks/useToday";

// The keyboard and touch route onto the calendar. Dragging is one way to
// schedule something; it can't be the only way.
export function SchedulePicker({ entry, blocks, onPick, onClose }) {
  const [dayOffset, setDayOffset] = useState(0);
  const closeRef = useRef(null);
  const today = useToday();

  const date = useMemo(() => {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(y, m - 1, d + dayOffset);
  }, [dayOffset, today]);

  const dateStr = toISODate(date);
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

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
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule ${entry.text}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet-grip" aria-hidden="true" />

        <div className="row spread gap-3" style={{ marginBottom: "var(--s3)" }}>
          <div className="stack" style={{ minWidth: 0 }}>
            <p className="eyebrow">Schedule</p>
            <p className="title" style={{ fontFamily: "var(--font-display)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.text}
            </p>
          </div>
          <button ref={closeRef} className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="row gap-2" style={{ marginBottom: "var(--s3)" }}>
          <button className="icon-btn" onClick={() => setDayOffset((n) => n - 1)} aria-label="Previous day">‹</button>
          <span className="grow" style={{ textAlign: "center", fontWeight: 600 }}>{dayLabel}</span>
          <button className="icon-btn" onClick={() => setDayOffset((n) => n + 1)} aria-label="Next day">›</button>
        </div>

        <ul className="time-grid" aria-label="Available times">
          {Array.from({ length: SLOTS_PER_DAY }, (_, i) => i).map((slotIndex) => {
            const startMinute = slotIndex * SLOT_MINUTES;
            const occupiedBy = taken.get(slotIndex);
            const isOwn = occupiedBy === entry.id;
            const busy = Boolean(occupiedBy) && !isOwn;
            return (
              <li key={slotIndex}>
                <button
                  className="time-btn"
                  data-busy={busy ? "true" : "false"}
                  data-own={isOwn ? "true" : "false"}
                  onClick={() => onPick(dateStr, startMinute)}
                  aria-label={`${minutesToLabel(startMinute)}${busy ? ", already booked" : ""}`}
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
