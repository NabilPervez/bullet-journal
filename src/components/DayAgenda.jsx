import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ROW_HEIGHT, ROW_HEIGHT_COMPACT, RESIZE_SNAP_MINUTES, SLOTS_PER_DAY, SLOT_MINUTES } from "../lib/constants";
import { visibleSlotRange } from "../lib/agenda";
import { minutesToLabel, startMinuteToHHMM, toISODate } from "../lib/dates";
import { ENTRY_TYPES } from "../lib/model";
import { useToday } from "../hooks/useToday";

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
  const resizingRef = useRef(null);
  const [liveResize, setLiveResize] = useState(null);

  // A 26px row is shorter than a fingertip; on a phone the rows are 44.
  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT;
  const today = useToday();

  const date = useMemo(() => {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(y, m - 1, d + dayOffset);
  }, [dayOffset, today]);
  const dateStr = toISODate(date);
  const isToday = dayOffset === 0;
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const dayBlocks = blocks.filter((b) => b.date === dateStr);
  // Render the part of the day that has something in it; the rest is one tap
  // away rather than a screen and a half of empty rows above it.
  const range = visibleSlotRange(dayBlocks, { expanded: showWholeDay || !compact });
  const slotIndices = Array.from({ length: range.last - range.first + 1 }, (_, i) => range.first + i);
  const hoverSlot = drag?.slot?.date === dateStr ? drag.slot.index : null;

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
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Window listeners still drive the gesture.
    }
  }

  // A focused block moves a slot at a time, or comes off the calendar.
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
      type === "event" ? { eventDate: dateStr, eventTime: startMinuteToHHMM(startMinute) } : { dueDate: dateStr }
    );
    setComposerSlot(null);
  }

  return (
    <section aria-label="Daily time-blocking agenda" className="stack gap-4">
      <div className="row spread wrap gap-3">
        <div className="stack">
          <h2 className="title">Schedule</h2>
          <p className="meta">{dayLabel}</p>
        </div>
        <div className="row gap-2">
          <button className="icon-btn" onClick={() => setDayOffset((n) => n - 1)} aria-label="Previous day">‹</button>
          <button className="btn btn-ghost" onClick={() => setDayOffset(0)} disabled={isToday}>Today</button>
          <button className="icon-btn" onClick={() => setDayOffset((n) => n + 1)} aria-label="Next day">›</button>
        </div>
      </div>

      {range.hiddenBefore > 0 && (
        <button className="agenda-expand" onClick={() => setShowWholeDay(true)}>
          ↑ Show {minutesToLabel(0)} – {minutesToLabel((range.first - 1) * SLOT_MINUTES)}
        </button>
      )}

      <div className="agenda">
        <div className="agenda-grid">
          {slotIndices.map((slotIndex) => (
            <Fragment key={slotIndex}>
              <div className="agenda-time" style={{ height: rowHeight }}>
                {slotIndex % 2 === 0 ? minutesToLabel(slotIndex * SLOT_MINUTES) : ""}
              </div>
              {/* A drop target and a click target, not a focus stop: 32 of
                  these in the tab order was 32 unlabelled buttons to a screen
                  reader. Keyboard scheduling goes through the picker. */}
              <div
                className="agenda-slot"
                data-slot-index={slotIndex}
                data-slot-date={dateStr}
                data-hover={hoverSlot === slotIndex ? "true" : "false"}
                onClick={() => setComposerSlot(slotIndex)}
                style={{ height: rowHeight }}
              />
            </Fragment>
          ))}
        </div>

        <div className="agenda-blocks">
          {dayBlocks.map((block) => {
            const entry = entryById[block.entryId];
            if (!entry) return null;
            const duration = liveResize?.id === block.id ? liveResize.duration : block.durationMinutes;
            const top = (block.startMinute / SLOT_MINUTES - range.first) * rowHeight;
            const height = (duration / SLOT_MINUTES) * rowHeight;
            const isDragging = drag?.payload?.kind === "block" && drag.payload.block.id === block.id;
            return (
              <div
                key={block.id}
                className="agenda-block"
                data-type={entry.type}
                tabIndex={0}
                role="button"
                aria-label={`${entry.text}, ${minutesToLabel(block.startMinute)}, ${duration} minutes. Arrow keys move it, Delete removes it.`}
                onKeyDown={(e) => handleBlockKey(e, block)}
                onPointerDown={(e) => startDrag(e, { kind: "block", block }, entry.text)}
                title={entry.eventLocation ? `${entry.text} — ${entry.eventLocation}` : entry.text}
                style={{ top, height, opacity: isDragging ? 0.4 : 1 }}
              >
                <span className="agenda-block-title">{entry.text}</span>
                {height > 34 && <span className="agenda-block-time">{minutesToLabel(block.startMinute)} · {duration}m</span>}
                <button
                  className="agenda-block-remove"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    unscheduleBlock(block);
                  }}
                  aria-label={`Take ${entry.text} off the calendar`}
                >
                  ✕
                </button>
                <div className="agenda-block-resize" role="presentation" onPointerDown={(e) => startResize(block, e)} />
              </div>
            );
          })}
        </div>
      </div>

      {range.hiddenAfter > 0 && (
        <button className="agenda-expand" onClick={() => setShowWholeDay(true)}>
          ↓ Show {minutesToLabel((range.last + 1) * SLOT_MINUTES)} – {minutesToLabel((SLOTS_PER_DAY - 1) * SLOT_MINUTES)}
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
    <div className="card stack gap-3" style={{ maxWidth: 520 }}>
      <div className="row spread gap-2">
        <p className="eyebrow">{dayLabel}</p>
        <span className="ticket">{time}</span>
      </div>

      <div className="row gap-2 wrap">
        {["event", "task", "goal"].map((t) => (
          <button key={t} className="chip" data-type={t} aria-pressed={type === t} onClick={() => setType(t)}>
            <span className="chip-glyph" aria-hidden="true">{ENTRY_TYPES[t].glyph}</span>
            {ENTRY_TYPES[t].label}
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        className="input input-lg"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(text, type);
          if (e.key === "Escape") onCancel();
        }}
        aria-label="What goes in this slot?"
        placeholder="What goes here?"
      />

      <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSubmit(text, type)} disabled={!text.trim()}>Add</button>
      </div>
    </div>
  );
}
