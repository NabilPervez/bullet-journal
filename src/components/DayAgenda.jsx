import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ROW_HEIGHT, ROW_HEIGHT_COMPACT, RESIZE_SNAP_MINUTES, SLOTS_PER_DAY, SLOT_MINUTES } from "../lib/constants";
import { visibleSlotRange } from "../lib/agenda";
import { minutesToLabel, startMinuteToHHMM, toISODate } from "../lib/dates";
import { ENTRY_TYPES } from "../lib/model";
import { C, fieldInputStyle, fontDisplay, fontMono, navBtnStyle } from "../theme";

export function DayAgenda({
  entries,
  blocks,
  unscheduleBlock,
  resizeBlock,
  moveBlock,
  addEntry,
  drag,
  startDrag,
  dayOffset,
  setDayOffset,
  compact = false,
}) {
  const entryById = useMemo(() => Object.fromEntries(entries.map((e) => [e.id, e])), [entries]);
  const [composerSlot, setComposerSlot] = useState(null);
  const [showWholeDay, setShowWholeDay] = useState(false);

  // A 26px row is shorter than a fingertip; on a phone the rows are 44.
  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT;
  const resizingRef = useRef(null);
  const [liveResize, setLiveResize] = useState(null);

  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dayOffset]);
  const dateStr = toISODate(date);
  const isToday = dayOffset === 0;
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const dayBlocks = blocks.filter((b) => b.date === dateStr);
  // Render the part of the day that has something in it. The rest is one tap
  // away rather than a screen and a half of empty rows above it.
  const range = visibleSlotRange(dayBlocks, { expanded: showWholeDay || !compact });
  const slotIndices = Array.from({ length: range.last - range.first + 1 }, (_, i) => range.first + i);
  const hoverSlot = drag?.slot?.date === dateStr ? drag.slot.index : null;

  // ---- Resize: pointer events, so it works under a finger, and snapped to
  // 15 minutes rather than a whole 30-minute slot. ----

  useEffect(() => {
    function onMove(event) {
      const ctx = resizingRef.current;
      if (!ctx || event.pointerId !== ctx.pointerId) return;
      if (event.cancelable) event.preventDefault();
      const pxPerStep = ctx.rowHeight * (RESIZE_SNAP_MINUTES / SLOT_MINUTES);
      const steps = Math.round((event.clientY - ctx.startY) / pxPerStep);
      const next = Math.max(RESIZE_SNAP_MINUTES, ctx.startDuration + steps * RESIZE_SNAP_MINUTES);
      ctx.liveDuration = next;
      setLiveResize({ id: ctx.block.id, duration: next });
    }

    function onUp(event) {
      const ctx = resizingRef.current;
      if (!ctx || event.pointerId !== ctx.pointerId) return;
      resizingRef.current = null;
      setLiveResize(null);
      if (ctx.liveDuration !== ctx.startDuration) resizeBlock(ctx.block, ctx.liveDuration);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizeBlock]);

  function startResize(block, event) {
    event.stopPropagation();
    event.preventDefault();
    resizingRef.current = {
      pointerId: event.pointerId,
      rowHeight,
      block,
      startY: event.clientY,
      startDuration: block.durationMinutes,
      liveDuration: block.durationMinutes,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  // Focused block: move it a slot at a time, or take it off the calendar.
  function handleBlockKey(event, block) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? -SLOT_MINUTES : SLOT_MINUTES;
      const last = (SLOTS_PER_DAY - 1) * SLOT_MINUTES;
      const next = Math.min(last, Math.max(0, block.startMinute + delta));
      if (next !== block.startMinute) moveBlock(block, block.date, next);
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      unscheduleBlock(block);
    }
  }

  async function submitComposer(text, type) {
    if (!text.trim()) return;
    const startMinute = composerSlot * SLOT_MINUTES;
    await addEntry(
      text.trim(),
      type,
      type === "event"
        ? { eventDate: dateStr, eventTime: startMinuteToHHMM(startMinute) }
        : { dueDate: dateStr }
    );
    setComposerSlot(null);
  }

  return (
    <section aria-label="Daily time-blocking agenda">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>Schedule</h2>
          <span style={{ fontFamily: fontMono, fontSize: 12, color: C.inkSoft }}>{dayLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setDayOffset((n) => n - 1)} aria-label="Previous day" style={navBtnStyle}>‹</button>
          <button
            onClick={() => setDayOffset(0)}
            aria-label="Go to today"
            disabled={isToday}
            style={{ ...navBtnStyle, width: "auto", padding: "0 12px", opacity: isToday ? 0.35 : 1, cursor: isToday ? "default" : "pointer" }}
          >
            Today
          </button>
          <button onClick={() => setDayOffset((n) => n + 1)} aria-label="Next day" style={navBtnStyle}>›</button>
        </div>
      </div>

      {range.hiddenBefore > 0 && (
        <button onClick={() => setShowWholeDay(true)} style={expanderStyle}>
          ↑ {minutesToLabel(0)} – {minutesToLabel((range.first - 1) * SLOT_MINUTES)}
        </button>
      )}

      <div style={{ border: `1px solid ${C.rule}`, borderRadius: 8, background: "rgba(255,255,255,0.4)", position: "relative", maxWidth: 480 }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr" }}>
          {slotIndices.map((slotIndex) => (
            <Fragment key={slotIndex}>
              <div
                style={{
                  borderRight: `1px solid ${C.rule}`,
                  borderBottom: `1px solid ${C.rule}`,
                  fontSize: 10,
                  fontFamily: fontMono,
                  color: C.inkFaint,
                  textAlign: "right",
                  paddingRight: 6,
                  height: rowHeight,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                }}
              >
                {slotIndex % 2 === 0 ? minutesToLabel(slotIndex * SLOT_MINUTES) : ""}
              </div>
              {/* A drop target and a click target, not a focus stop: 32 of
                  these in the tab order was 32 unlabelled buttons to a screen
                  reader. Keyboard scheduling goes through the picker. */}
              <div
                data-slot-index={slotIndex}
                data-slot-date={dateStr}
                onClick={() => setComposerSlot(slotIndex)}
                style={{
                  borderBottom: `1px solid ${C.rule}`,
                  height: rowHeight,
                  cursor: "pointer",
                  background: hoverSlot === slotIndex ? "rgba(38,54,92,0.2)" : "transparent",
                }}
              />
            </Fragment>
          ))}
        </div>

        <div style={{ position: "absolute", top: 0, left: 56, right: 0, bottom: 0, pointerEvents: "none" }}>
          {dayBlocks.map((block) => {
            const entry = entryById[block.entryId];
            if (!entry) return null;
            const duration = liveResize?.id === block.id ? liveResize.duration : block.durationMinutes;
            const top = ((block.startMinute / SLOT_MINUTES) - range.first) * rowHeight;
            const height = (duration / SLOT_MINUTES) * rowHeight;
            const isDragging = drag?.payload?.kind === "block" && drag.payload.block.id === block.id;
            return (
              <div
                key={block.id}
                className="agenda-block"
                tabIndex={0}
                role="button"
                aria-label={`${entry.text}, ${minutesToLabel(block.startMinute)}, ${duration} minutes. Arrow keys move it, Delete removes it.`}
                onKeyDown={(e) => handleBlockKey(e, block)}
                onPointerDown={(e) => startDrag(e, { kind: "block", block }, entry.text)}
                title={entry.eventLocation ? `${entry.text} — ${entry.eventLocation}` : entry.text}
                style={{
                  pointerEvents: "auto",
                  position: "absolute",
                  left: 2,
                  right: 2,
                  top,
                  height,
                  borderRadius: 6,
                  background: C.accent,
                  color: C.paper,
                  padding: "2px 8px",
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  opacity: isDragging ? 0.4 : 1,
                  cursor: "grab",
                }}
              >
                <p style={{ fontFamily: fontMono, fontSize: 11, lineHeight: 1.3, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.text}
                </p>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    unscheduleBlock(block);
                  }}
                  aria-label={`Remove ${entry.text} from calendar`}
                  style={{ position: "absolute", top: 0, right: 0, width: 28, height: 28, background: "none", border: "none", color: C.paper, fontSize: 12, cursor: "pointer", opacity: 0.8 }}
                >
                  ✕
                </button>
                <div
                  onPointerDown={(e) => startResize(block, e)}
                  role="presentation"
                  style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, cursor: "ns-resize", touchAction: "none" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {range.hiddenAfter > 0 && (
        <button onClick={() => setShowWholeDay(true)} style={expanderStyle}>
          ↓ {minutesToLabel((range.last + 1) * SLOT_MINUTES)} – {minutesToLabel((SLOTS_PER_DAY - 1) * SLOT_MINUTES)}
        </button>
      )}

      {composerSlot !== null && (
        <SlotComposer
          time={minutesToLabel(composerSlot * SLOT_MINUTES)}
          dayLabel={dayLabel}
          onSubmit={submitComposer}
          onCancel={() => setComposerSlot(null)}
        />
      )}
    </section>
  );
}

// Replaces window.prompt: styled, cancellable, and able to say what kind of
// thing is being added rather than always creating an event.
function SlotComposer({ time, dayLabel, onSubmit, onCancel }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("event");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      style={{
        marginTop: 12,
        maxWidth: 480,
        border: `1px solid ${C.rule}`,
        borderRadius: 10,
        padding: 12,
        background: "rgba(255,255,255,0.6)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint, margin: 0 }}>
        {dayLabel} · {time}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        {["event", "task", "goal"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            aria-pressed={type === t}
            style={{
              fontFamily: fontMono,
              fontSize: 12,
              minHeight: 36,
              padding: "0 12px",
              borderRadius: 999,
              border: `1px solid ${type === t ? C.ink : C.rule}`,
              background: type === t ? C.ink : "transparent",
              color: type === t ? C.paper : C.inkSoft,
              cursor: "pointer",
            }}
          >
            {ENTRY_TYPES[t].glyph} {ENTRY_TYPES[t].label}
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(text, type);
          if (e.key === "Escape") onCancel();
        }}
        aria-label="What goes in this slot?"
        placeholder="What goes here?"
        style={fieldInputStyle}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{ fontFamily: fontMono, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", minHeight: 44, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.rule}`, background: "transparent", color: C.inkSoft, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(text, type)}
          disabled={!text.trim()}
          style={{ fontFamily: fontMono, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", minHeight: 44, padding: "0 18px", borderRadius: 8, border: "none", background: C.accent, color: C.paper, cursor: "pointer", opacity: text.trim() ? 1 : 0.4 }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

const expanderStyle = {
  display: "block",
  width: "100%",
  maxWidth: 480,
  minHeight: 44,
  margin: "6px 0",
  fontFamily: fontMono,
  fontSize: 12,
  color: C.inkSoft,
  background: "transparent",
  border: `1px dashed ${C.rule}`,
  borderRadius: 8,
  cursor: "pointer",
};
