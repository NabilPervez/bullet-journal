import { useState, useEffect, useRef } from "react";
import { useSwipeActions } from "../hooks/useSwipeActions";
import { SWIPE_THRESHOLD_PX } from "../lib/gestures";
import { ENTRY_TYPES, SIGNIFIERS, isSchedulable } from "../lib/model";
import { formatDateShort, formatTimeShort } from "../lib/dates";
import { C, fieldInputStyle, fieldLabelStyle, fontBody, fontDisplay, fontMono } from "../theme";

export function EntryRow({ entry, onToggle, onDelete, onSave, isDragging, onStartDrag, onSchedule }) {
  const [hover, setHover] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    text: entry.text,
    signifier: entry.signifier || "none",
    dueDate: entry.dueDate || "",
    eventDate: entry.eventDate || "",
    eventTime: entry.eventTime || "",
    eventLocation: entry.eventLocation || "",
  }));
  const inputRef = useRef(null);
  const meta = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.note;
  const signifierMeta = SIGNIFIERS[entry.signifier || "none"];
  // Anything with a date can go on the calendar; a note is a record of
  // something that already happened.
  const canSchedule = isSchedulable(entry) && !entry.scheduledBlockId;
  const draggable = canSchedule && Boolean(onStartDrag);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const { offset, handlers: swipeHandlers } = useSwipeActions({
    onComplete: onToggle,
    onDelete: onDelete,
    enabled: !isEditing,
  });
  const revealed = Math.abs(offset) >= SWIPE_THRESHOLD_PX;


  function startEdit() {
    setDraft({
      text: entry.text,
      signifier: entry.signifier || "none",
      dueDate: entry.dueDate || "",
      eventDate: entry.eventDate || "",
      eventTime: entry.eventTime || "",
      eventLocation: entry.eventLocation || "",
    });
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.text.trim();
    if (!trimmed) {
      setIsEditing(false);
      return;
    }
    onSave({
      text: trimmed,
      signifier: draft.signifier === "none" ? null : draft.signifier,
      dueDate: (entry.type === "task" || entry.type === "goal") ? draft.dueDate || null : entry.dueDate,
      eventDate: entry.type === "event" ? draft.eventDate || null : entry.eventDate,
      eventTime: entry.type === "event" ? draft.eventTime || null : entry.eventTime,
      eventLocation: entry.type === "event" ? draft.eventLocation || null : entry.eventLocation,
    });
    setIsEditing(false);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  const metaLine = [];
  if (entry.type === "event" && entry.eventDate) {
    metaLine.push(formatDateShort(entry.eventDate) + (entry.eventTime ? ` · ${formatTimeShort(entry.eventTime)}` : ""));
  }
  if (entry.type === "event" && entry.eventLocation) metaLine.push(entry.eventLocation);
  if ((entry.type === "task" || entry.type === "goal") && entry.dueDate) metaLine.push(`Due ${formatDateShort(entry.dueDate)}`);

  return (
    <li
      className="entry-row"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", borderRadius: 6, overflow: "hidden", opacity: isDragging ? 0.4 : 1 }}
    >
      {offset !== 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: offset > 0 ? "flex-start" : "flex-end",
            padding: "0 14px",
            borderRadius: 6,
            background: offset > 0 ? C.accent : C.critical,
            color: C.paper,
            fontFamily: fontMono,
            fontSize: 12,
            opacity: revealed ? 1 : 0.55,
          }}
        >
          {offset > 0 ? (entry.done ? "Reopen" : "Done") : "Delete"}
        </div>
      )}
      <div
        {...swipeHandlers}
        style={{
          position: "relative",
          padding: "6px 8px",
          borderRadius: 6,
          border: `1px solid ${hover || isEditing ? C.rule : "transparent"}`,
          background: hover || isEditing || offset !== 0 ? "rgba(255,255,255,0.86)" : C.paper,
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 0.18s ease-out" : "none",
          touchAction: "pan-y",
        }}
      >
      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: fontDisplay, fontSize: 15, width: 20, textAlign: "center", color: C.inkSoft, flexShrink: 0 }}>{meta.glyph}</span>
            <input
              ref={inputRef}
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              aria-label="Edit entry text"
              style={{ ...fieldInputStyle, flex: 1, fontSize: 14 }}
            />
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(SIGNIFIERS).map(([key, sm]) => (
              <button
                type="button"
                key={key}
                onClick={() => setDraft((d) => ({ ...d, signifier: key }))}
                aria-pressed={draft.signifier === key}
                title={sm.label}
                style={{
                  fontFamily: fontMono,
                  fontSize: 10,
                  width: 24,
                  padding: "3px 0",
                  borderRadius: 999,
                  border: `1px solid ${draft.signifier === key ? C.accent : C.rule}`,
                  background: draft.signifier === key ? C.accent : "transparent",
                  color: draft.signifier === key ? C.paper : C.inkSoft,
                  cursor: "pointer",
                }}
              >
                {sm.char || "–"}
              </button>
            ))}
          </div>

          {entry.type === "event" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div>
                <label style={fieldLabelStyle}>Date</label>
                <input type="date" value={draft.eventDate} onChange={(e) => setDraft((d) => ({ ...d, eventDate: e.target.value }))} style={fieldInputStyle} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Time</label>
                <input type="time" value={draft.eventTime} onChange={(e) => setDraft((d) => ({ ...d, eventTime: e.target.value }))} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={fieldLabelStyle}>Location</label>
                <input type="text" value={draft.eventLocation} onChange={(e) => setDraft((d) => ({ ...d, eventLocation: e.target.value }))} style={fieldInputStyle} />
              </div>
            </div>
          )}

          {(entry.type === "task" || entry.type === "goal") && (
            <div style={{ maxWidth: 180 }}>
              <label style={fieldLabelStyle}>Due date</label>
              <input type="date" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} style={fieldInputStyle} />
            </div>
          )}

          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={cancelEdit}
              style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.rule}`, background: "transparent", color: C.inkSoft, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitEdit}
              style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer" }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          {draggable && !isEditing && (
            <span
              className="drag-handle"
              role="presentation"
              aria-hidden="true"
              title="Drag onto the schedule"
              onPointerDown={(e) => onStartDrag(e, entry)}
              style={{ fontFamily: fontMono, fontSize: 12, color: C.inkFaint, cursor: "grab", flexShrink: 0, lineHeight: 1.4 }}
            >
              ⠿
            </span>
          )}
          <button
            onClick={onToggle}
            aria-label={entry.done ? "Mark entry as not done" : "Mark entry as done"}
            aria-pressed={!!entry.done}
            style={{ fontFamily: fontDisplay, fontSize: 15, width: 20, textAlign: "center", color: C.inkSoft, background: "none", border: "none", cursor: "pointer", flexShrink: 0, paddingTop: 1 }}
          >
            {entry.done ? "×" : meta.glyph}
          </button>

          <div style={{ flex: 1, minWidth: 0, cursor: "text" }} onDoubleClick={startEdit}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              {signifierMeta.char && (
                <span aria-label={signifierMeta.label} title={signifierMeta.label} style={{ fontFamily: fontMono, fontSize: 11, color: C.accent }}>
                  {signifierMeta.char}
                </span>
              )}
              <span style={{ fontFamily: fontBody, fontSize: "var(--fs-body)", color: entry.done ? C.inkFaint : C.ink, textDecoration: entry.done ? "line-through" : "none", transition: "color 0.15s ease-out" }}>
                {entry.text}
              </span>
            </div>
            {metaLine.length > 0 && (
              <p style={{ margin: "1px 0 0", fontFamily: fontMono, fontSize: "var(--fs-meta)", color: C.inkFaint }}>{metaLine.join(" · ")}</p>
            )}
          </div>

          {entry.scheduledBlockId && (
            <span aria-label="Scheduled on calendar" title="Scheduled on calendar" style={{ fontFamily: fontMono, fontSize: 12, color: C.accent, flexShrink: 0 }}>
              →
            </span>
          )}

          {canSchedule && onSchedule && (
            <button
              onClick={() => onSchedule(entry)}
              className="entry-action"
              aria-label={`Schedule: ${entry.text}`}
              title="Schedule"
              style={{ opacity: hover ? 1 : 0, transition: "opacity 0.15s", color: C.inkFaint, background: "none", border: "none", fontFamily: fontMono, fontSize: 12, cursor: "pointer", flexShrink: 0 }}
            >
              ⊕
            </button>
          )}
          <button
            onClick={startEdit}
            className="entry-action"
            aria-label={`Edit entry: ${entry.text}`}
            style={{ opacity: hover ? 1 : 0, transition: "opacity 0.15s", color: C.inkFaint, background: "none", border: "none", fontFamily: fontMono, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
          >
            ✎
          </button>
          <button
            onClick={onDelete}
            className="entry-action"
            aria-label={`Delete entry: ${entry.text}`}
            style={{ opacity: hover ? 1 : 0, transition: "opacity 0.15s", color: C.inkFaint, background: "none", border: "none", fontFamily: fontMono, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
          >
            ✕
          </button>
          </div>
        )}
      </div>
    </li>
  );
}
