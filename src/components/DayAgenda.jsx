import { Fragment, useState, useRef, useMemo } from "react";
import { ROW_HEIGHT, SLOTS_PER_DAY, SLOT_MINUTES } from "../lib/constants";
import { minutesToLabel, startMinuteToHHMM, toISODate } from "../lib/dates";
import { C, fontDisplay, fontMono, navBtnStyle } from "../theme";

export function DayAgenda({ entries, blocks, scheduleEntry, unscheduleBlock, resizeBlock, moveBlock, addEntry, setDragEntryId }) {
  const entryById = useMemo(() => Object.fromEntries(entries.map((e) => [e.id, e])), [entries]);
  const [dayOffset, setDayOffset] = useState(0);
  const [hoverSlot, setHoverSlot] = useState(null);
  const [dragBlockId, setDragBlockId] = useState(null);
  const resizingRef = useRef(null);
  const [, forceTick] = useState(0);

  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dayOffset]);
  const dateStr = toISODate(date);
  const isToday = dayOffset === 0;
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const slotIndices = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);
  const dayBlocks = blocks.filter((b) => b.date === dateStr);

  async function handleDrop(e, slotIndex) {
    e.preventDefault();
    setHoverSlot(null);
    const blockId = e.dataTransfer.getData("text/block-id");
    const entryId = e.dataTransfer.getData("text/entry-id");
    if (blockId) {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      await moveBlock(block, dateStr, slotIndex * SLOT_MINUTES);
      setDragBlockId(null);
      return;
    }
    if (entryId) {
      const entry = entryById[entryId];
      if (!entry || entry.scheduledBlockId) return;
      await scheduleEntry(entry, dateStr, slotIndex * SLOT_MINUTES, SLOT_MINUTES);
      setDragEntryId(null);
    }
  }

  async function handleSlotClick(slotIndex) {
    const label = window.prompt("Block label:");
    if (!label || !label.trim()) return;
    await addEntry(label.trim(), "event", { eventDate: dateStr, eventTime: startMinuteToHHMM(slotIndex * SLOT_MINUTES) });
  }

  function handleBlockDragStart(e, block) {
    e.dataTransfer.setData("text/block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
    setDragBlockId(block.id);
  }

  function startResize(block, e) {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = { block, startY: e.clientY, startDuration: block.durationMinutes, liveDuration: block.durationMinutes };
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  }

  function onResizeMove(e) {
    const ctx = resizingRef.current;
    if (!ctx) return;
    const deltaY = e.clientY - ctx.startY;
    const deltaSlots = Math.round(deltaY / ROW_HEIGHT);
    ctx.liveDuration = Math.max(SLOT_MINUTES, ctx.startDuration + deltaSlots * SLOT_MINUTES);
    forceTick((n) => n + 1);
  }

  async function onResizeEnd() {
    const ctx = resizingRef.current;
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeEnd);
    if (ctx && ctx.liveDuration !== ctx.startDuration) {
      await resizeBlock(ctx.block, ctx.liveDuration);
    }
    resizingRef.current = null;
    forceTick((n) => n + 1);
  }

  return (
    <section aria-label="Daily time-blocking agenda">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>Today's Schedule</h2>
          <span style={{ fontFamily: fontMono, fontSize: 11, color: C.inkSoft }}>{dayLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setDayOffset((n) => n - 1)} aria-label="Previous day" style={navBtnStyle}>‹</button>
          <button
            onClick={() => setDayOffset(0)}
            aria-label="Go to today"
            disabled={isToday}
            style={{ ...navBtnStyle, width: "auto", padding: "0 10px", opacity: isToday ? 0.35 : 1, cursor: isToday ? "default" : "pointer" }}
          >
            Today
          </button>
          <button onClick={() => setDayOffset((n) => n + 1)} aria-label="Next day" style={navBtnStyle}>›</button>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.rule}`, borderRadius: 8, background: "rgba(255,255,255,0.4)", position: "relative", maxWidth: 480 }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr" }}>
          {slotIndices.map((slotIndex) => {
            const isHover = hoverSlot === slotIndex;
            return (
              <Fragment key={slotIndex}>
                <div
                  style={{
                    borderRight: `1px solid ${C.rule}`,
                    borderBottom: `1px solid ${C.rule}`,
                    fontSize: 9,
                    fontFamily: fontMono,
                    color: C.inkFaint,
                    textAlign: "right",
                    paddingRight: 6,
                    height: ROW_HEIGHT,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                  }}
                >
                  {slotIndex % 2 === 0 ? minutesToLabel(slotIndex * SLOT_MINUTES) : ""}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${dayLabel} at ${minutesToLabel(slotIndex * SLOT_MINUTES)}`}
                  onClick={() => handleSlotClick(slotIndex)}
                  onKeyDown={(e) => (e.key === "Enter" ? handleSlotClick(slotIndex) : null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverSlot(slotIndex);
                  }}
                  onDragLeave={() => setHoverSlot(null)}
                  onDrop={(e) => handleDrop(e, slotIndex)}
                  style={{
                    borderBottom: `1px solid ${C.rule}`,
                    height: ROW_HEIGHT,
                    cursor: "pointer",
                    background: isHover ? "rgba(38,54,92,0.2)" : "transparent",
                  }}
                />
              </Fragment>
            );
          })}
        </div>

        <div style={{ position: "absolute", top: 0, left: 56, right: 0, bottom: 0, pointerEvents: "none" }}>
          {dayBlocks.map((block) => {
            const entry = entryById[block.entryId];
            if (!entry) return null;
            const isResizing = resizingRef.current?.block.id === block.id;
            const duration = isResizing ? resizingRef.current.liveDuration : block.durationMinutes;
            const top = (block.startMinute / SLOT_MINUTES) * ROW_HEIGHT;
            const height = (duration / SLOT_MINUTES) * ROW_HEIGHT;
            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => handleBlockDragStart(e, block)}
                onDragEnd={() => setDragBlockId(null)}
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
                  opacity: dragBlockId === block.id ? 0.4 : 1,
                  cursor: "grab",
                }}
              >
                <p style={{ fontFamily: fontMono, fontSize: 11, lineHeight: 1.3, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.text}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    unscheduleBlock(block);
                  }}
                  aria-label={`Remove ${entry.text} from calendar`}
                  style={{ position: "absolute", top: 2, right: 4, background: "none", border: "none", color: C.paper, fontSize: 11, cursor: "pointer", opacity: 0.7 }}
                >
                  ✕
                </button>
                <div
                  onMouseDown={(e) => startResize(block, e)}
                  role="separator"
                  aria-label={`Resize ${entry.text} block`}
                  style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, cursor: "ns-resize" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
