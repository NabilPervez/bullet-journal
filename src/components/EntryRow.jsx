import { useEffect, useRef, useState } from "react";
import { useSwipeActions } from "../hooks/useSwipeActions";
import { SWIPE_THRESHOLD_PX } from "../lib/gestures";
import { ENTRY_TYPES, SIGNIFIERS, isSchedulable } from "../lib/model";
import { formatDateShort, formatTimeShort } from "../lib/dates";

export function EntryRow({ entry, onToggle, onDelete, onSave, isDragging, onStartDrag, onSchedule }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(entry));
  const inputRef = useRef(null);

  const meta = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.note;
  const signifierMeta = SIGNIFIERS[entry.signifier || "none"];
  const canSchedule = isSchedulable(entry) && !entry.scheduledBlockId;
  const draggable = canSchedule && Boolean(onStartDrag);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const { offset, handlers: swipeHandlers } = useSwipeActions({
    onComplete: onToggle,
    onDelete,
    enabled: !isEditing,
  });
  const revealed = Math.abs(offset) >= SWIPE_THRESHOLD_PX;

  function startEdit() {
    setDraft(toDraft(entry));
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
      dueDate: entry.type === "task" || entry.type === "goal" ? draft.dueDate || null : entry.dueDate,
      eventDate: entry.type === "event" ? draft.eventDate || null : entry.eventDate,
      eventTime: entry.type === "event" ? draft.eventTime || null : entry.eventTime,
      eventLocation: entry.type === "event" ? draft.eventLocation || null : entry.eventLocation,
    });
    setIsEditing(false);
  }

  const tickets = [];
  if (entry.type === "event" && entry.eventDate) {
    tickets.push(formatDateShort(entry.eventDate) + (entry.eventTime ? ` · ${formatTimeShort(entry.eventTime)}` : ""));
  }
  if (entry.type === "event" && entry.eventLocation) tickets.push(entry.eventLocation);
  if ((entry.type === "task" || entry.type === "goal") && entry.dueDate) tickets.push(`Due ${formatDateShort(entry.dueDate)}`);

  if (isEditing) {
    return (
      <li className="entry-row">
        <div className="entry-body stack gap-3">
          <div className="row gap-3">
            <span className="sticker sticker-static" data-type={entry.type} aria-hidden="true">{meta.glyph}</span>
            <input
              ref={inputRef}
              className="input grow"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) commitEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              aria-label="Edit entry text"
            />
          </div>

          {entry.type === "event" ? (
            <div className="stack gap-3">
              <div className="row gap-3">
                <div className="field grow">
                  <span className="field-label">Date</span>
                  <input className="input" type="date" value={draft.eventDate} aria-label="Event date"
                    onChange={(e) => setDraft((d) => ({ ...d, eventDate: e.target.value }))} />
                </div>
                <div className="field grow">
                  <span className="field-label">Time</span>
                  <input className="input" type="time" value={draft.eventTime} aria-label="Event time"
                    onChange={(e) => setDraft((d) => ({ ...d, eventTime: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <span className="field-label">Where</span>
                <input className="input" type="text" value={draft.eventLocation} aria-label="Event location"
                  onChange={(e) => setDraft((d) => ({ ...d, eventLocation: e.target.value }))} />
              </div>
            </div>
          ) : (
            (entry.type === "task" || entry.type === "goal") && (
              <div className="field">
                <span className="field-label">Due date</span>
                <input className="input" type="date" value={draft.dueDate} aria-label="Due date"
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} />
              </div>
            )
          )}

          <div className="row gap-2 wrap">
            {Object.entries(SIGNIFIERS).map(([key, sm]) => (
              <button
                key={key}
                type="button"
                className="chip"
                aria-pressed={draft.signifier === key}
                onClick={() => setDraft((d) => ({ ...d, signifier: key }))}
              >
                {sm.char && <span aria-hidden="true">{sm.char}</span>}
                {sm.label}
              </button>
            ))}
          </div>

          <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={commitEdit}>Save</button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="entry-row" style={{ opacity: isDragging ? 0.4 : 1 }}>
      {offset !== 0 && (
        <div
          aria-hidden="true"
          className="entry-rail"
          style={{
            justifyContent: offset > 0 ? "flex-start" : "flex-end",
            background: offset > 0 ? "var(--accent)" : "var(--danger)",
            color: offset > 0 ? "var(--on-accent)" : "#fff",
            opacity: revealed ? 1 : 0.6,
          }}
        >
          {offset > 0 ? (entry.done ? "Reopen" : "Done") : "Delete"}
        </div>
      )}

      <div
        {...swipeHandlers}
        className="entry-body"
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 0.18s ease-out" : "none",
        }}
      >
        {draggable && (
          <span
            className="drag-handle"
            role="presentation"
            aria-hidden="true"
            title="Drag onto the schedule"
            onPointerDown={(e) => onStartDrag(e, entry)}
          >
            ⠿
          </span>
        )}

        <button
          className="sticker"
          data-type={entry.type}
          data-done={entry.done ? "true" : "false"}
          onClick={onToggle}
          aria-pressed={Boolean(entry.done)}
          aria-label={entry.done ? `Mark "${entry.text}" as not done` : `Mark "${entry.text}" as done`}
        >
          {entry.done ? "✓" : meta.glyph}
        </button>

        <div className="grow stack gap-2" onDoubleClick={startEdit}>
          <div className="row gap-2 wrap" style={{ alignItems: "baseline" }}>
            {signifierMeta.char && (
              <span
                aria-label={signifierMeta.label}
                title={signifierMeta.label}
                style={{ color: "var(--flare)", fontWeight: 800 }}
              >
                {signifierMeta.char}
              </span>
            )}
            <span className="entry-text" data-done={entry.done ? "true" : "false"}>{entry.text}</span>
            {entry.done && <span className="stamp">Done</span>}
          </div>

          {(tickets.length > 0 || entry.scheduledBlockId) && (
            <div className="row gap-2 wrap">
              {tickets.map((t) => (
                <span key={t} className="ticket">{t}</span>
              ))}
              {entry.scheduledBlockId && (
                <span className="ticket" style={{ color: "var(--accent-ink)" }} title="On the schedule">▸ Scheduled</span>
              )}
            </div>
          )}
        </div>

        <div className="entry-actions">
          {canSchedule && onSchedule && (
            <button
              className="icon-btn icon-btn-sm"
              onClick={() => onSchedule(entry)}
              aria-label={`Schedule "${entry.text}"`}
              title="Schedule"
            >
              ⊕
            </button>
          )}
          <button
            className="icon-btn icon-btn-sm"
            onClick={startEdit}
            aria-label={`Edit "${entry.text}"`}
            title="Edit"
          >
            ✎
          </button>
          <button
            className="icon-btn icon-btn-sm icon-btn-danger"
            onClick={onDelete}
            aria-label={`Delete "${entry.text}"`}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </li>
  );
}

function toDraft(entry) {
  return {
    text: entry.text,
    signifier: entry.signifier || "none",
    dueDate: entry.dueDate || "",
    eventDate: entry.eventDate || "",
    eventTime: entry.eventTime || "",
    eventLocation: entry.eventLocation || "",
  };
}
