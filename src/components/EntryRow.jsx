import { useEffect, useRef, useState } from "react";
import { useSwipeActions } from "../hooks/useSwipeActions";
import { SWIPE_THRESHOLD_PX } from "../lib/gestures";
import { ENTRY_TYPES, SIGNIFIERS, hasDueDate, isSchedulable } from "../lib/model";
import { hasChecklist, subtaskProgress } from "../lib/subtasks";
import { formatDateShort, formatTimeShort } from "../lib/dates";
import { anchorRepeat, describeRepeat } from "../lib/recurrence";
import { RepeatPicker } from "./RepeatPicker";
import { Checklist } from "./Checklist";
import { StorePicker } from "./StorePicker";

export function EntryRow({ entry, onToggle, onDelete, onSave, isDragging, onStartDrag, onSchedule, showType = true }) {
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
      dueDate: hasDueDate(entry.type) ? draft.dueDate || null : entry.dueDate,
      store: entry.type === "shopping" ? draft.store.trim() || null : entry.store ?? null,
      subtasks: hasChecklist(entry.type) ? draft.subtasks : entry.subtasks ?? [],
      eventDate: entry.type === "event" ? draft.eventDate || null : entry.eventDate,
      eventTime: entry.type === "event" ? draft.eventTime || null : entry.eventTime,
      eventLocation: entry.type === "event" ? draft.eventLocation || null : entry.eventLocation,
      repeat: draft.repeat
        ? anchorRepeat(draft.repeat, entry.type === "event" ? draft.eventDate : draft.dueDate)
        : null,
    });
    setIsEditing(false);
  }

  const tickets = [];
  if (entry.type === "event" && entry.eventDate) {
    tickets.push(formatDateShort(entry.eventDate) + (entry.eventTime ? ` · ${formatTimeShort(entry.eventTime)}` : ""));
  }
  if (entry.type === "event" && entry.eventLocation) tickets.push(entry.eventLocation);
  if (entry.type === "shopping" && entry.store) tickets.push(`at ${entry.store}`);
  if (hasDueDate(entry.type) && entry.dueDate) tickets.push(`Due ${formatDateShort(entry.dueDate)}`);

  const subtasks = entry.subtasks ?? [];
  const progress = subtaskProgress(subtasks);
  // A shopping list always shows its items (and the box to add one); a task
  // only once it has been broken into steps, so a plain task stays one line.
  const showChecklist = hasChecklist(entry.type) && (entry.type === "shopping" || subtasks.length > 0);
  const itemsLabel = entry.type === "shopping" ? "Items" : "Sub-tasks";

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
            hasDueDate(entry.type) && (
              <div className="field">
                <span className="field-label">Due date</span>
                <input className="input" type="date" value={draft.dueDate} aria-label="Due date"
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} />
              </div>
            )
          )}

          {entry.type === "shopping" && (
            <StorePicker
              value={draft.store}
              onChange={(store) => setDraft((d) => ({ ...d, store }))}
              idPrefix={`edit-${entry.id}-store`}
            />
          )}

          {hasChecklist(entry.type) && (
            <Checklist
              items={draft.subtasks}
              onChange={(list) => setDraft((d) => ({ ...d, subtasks: list }))}
              label={itemsLabel}
              addLabel={entry.type === "shopping" ? "Add an item to buy" : "Add a sub-task"}
              placeholder={entry.type === "shopping" ? "Add an item, press Enter" : "Add a step, press Enter"}
              idPrefix={`edit-${entry.id}-items`}
            />
          )}

          {entry.type !== "note" && (
            <RepeatPicker
              value={draft.repeat}
              onChange={(repeat) => setDraft((d) => ({ ...d, repeat }))}
              idPrefix={`edit-${entry.id}`}
            />
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
    <li className="entry-row enter" style={{ opacity: isDragging ? 0.4 : 1 }}>
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
        data-type={entry.type}
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

        {/* Tick it off. The type colour moved to the card's left edge so the
            checkbox can lead the row, where a checkbox belongs. */}
        <button
          className="check-btn"
          role="checkbox"
          aria-checked={Boolean(entry.done)}
          onClick={onToggle}
          aria-label={entry.done ? `Mark "${entry.text}" as not done` : `Mark "${entry.text}" as done`}
        >
          <span className="check-box" aria-hidden="true">✓</span>
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

          <div className="row gap-2 wrap">
            {/* Inside a bundle the group heading already says the kind, so
                the row doesn't repeat it. */}
            {showType && (
              <span
                className="sticker sticker-sm sticker-static"
                data-type={entry.type}
                title={meta.label}
                aria-label={meta.label}
              >
                {meta.glyph}
              </span>
            )}
            {tickets.map((t) => (
              <span key={t} className="ticket">{t}</span>
            ))}
            {entry.repeat && (
              <span className="ticket" style={{ color: "var(--accent-ink)" }} title="Repeats">
                ↻ {describeRepeat(entry.repeat)}
              </span>
            )}
            {progress.total > 0 && (
              <span
                className="ticket"
                data-complete={progress.complete ? "true" : "false"}
                title={`${progress.done} of ${progress.total} ${itemsLabel.toLowerCase()} done`}
              >
                ☑ {progress.done}/{progress.total}
              </span>
            )}
            {entry.scheduledBlockId && (
              <span className="ticket" style={{ color: "var(--accent-ink)" }} title="On the schedule">▸ Scheduled</span>
            )}
          </div>

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
        {/* Ticking an item saves at once. Double-click edits the entry
            everywhere else on the row, but not here, where fast taps on
            items would otherwise open the editor. */}
        {showChecklist && (
          <div className="entry-checklist" onDoubleClick={(e) => e.stopPropagation()}>
            <Checklist
              items={subtasks}
              onChange={(list) => onSave({ subtasks: list })}
              label={itemsLabel}
              addLabel={entry.type === "shopping" ? `Add an item to ${entry.text}` : `Add a sub-task to ${entry.text}`}
              placeholder={entry.type === "shopping" ? "Add an item" : "Add a step"}
              idPrefix={`row-${entry.id}-items`}
            />
          </div>
        )}
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
    repeat: entry.repeat || null,
    store: entry.store || "",
    subtasks: entry.subtasks ?? [],
  };
}
