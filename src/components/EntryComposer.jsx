import { useEffect, useRef, useState } from "react";
import { ENTRY_TYPES, SIGNIFIERS, isDatedType } from "../lib/model";
import { addInterval, describeRepeat, ROUTINES } from "../lib/recurrence";
import { toISODate } from "../lib/dates";
import { RepeatPicker } from "./RepeatPicker";

// The old composer crammed four type chips, three signifier chips and a
// divider onto one shelf, then hid the date fields under it. Here each
// decision gets its own labelled row, every target is at least 46px, and the
// fields that appear depend on what you're writing.
export function EntryComposer({ addEntry, onDone, autoFocus = false, idPrefix = "new-entry", compact = false }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("task");
  const [signifier, setSignifier] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [repeat, setRepeat] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const needsDate = type === "event";
  const canSubmit = Boolean(text.trim()) && (!needsDate || Boolean(eventDate));

  function reset() {
    setText("");
    setSignifier("none");
    setDueDate("");
    setEventDate("");
    setEventTime("");
    setEventLocation("");
    setRepeat(null);
    setShowDetails(false);
  }

  async function submit(event) {
    event?.preventDefault();
    if (!canSubmit) return;
    const today = toISODate(new Date());
    const repeating = isDatedType(type) ? repeat : null;
    const due = isDatedType(type) && type !== "event" ? dueDate || (repeating ? today : "") : "";
    await addEntry(text.trim(), type, {
      signifier: signifier === "none" ? null : signifier,
      repeat: repeating,
      dueDate: due || null,
      eventDate: type === "event" ? eventDate : null,
      eventTime: type === "event" ? eventTime : null,
      eventLocation: type === "event" ? eventLocation : null,
    });
    reset();
    onDone?.();
  }

  const detailsOpen = showDetails || needsDate;

  // A routine fills the whole composer in one tap: tapping "Oil change" right
  // after having one means the next is due six months from today.
  function applyRoutine(routine) {
    setType(routine.type);
    setText(routine.text);
    setRepeat(routine.repeat);
    setDueDate(addInterval(toISODate(new Date()), routine.repeat));
    setShowDetails(true);
  }

  return (
    <form className={compact ? "stack gap-4" : "panel stack gap-4"} onSubmit={submit}>
      {/* 1 — what are you writing down? */}
      <fieldset className="stack gap-2" style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
        <legend className="field-label" style={{ padding: 0 }}>Kind</legend>
        <div className="chip-grid" role="radiogroup" aria-label="Entry type">
          {Object.entries(ENTRY_TYPES).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={type === key}
              data-type={key}
              className="chip"
              onClick={() => setType(key)}
            >
              <span className="chip-glyph" aria-hidden="true">{meta.glyph}</span>
              {meta.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* 2 — the thing itself */}
      <div className="field">
        <label className="field-label" htmlFor={idPrefix}>
          {type === "event" ? "What's happening?" : type === "goal" ? "What are you aiming at?" : "What's on your mind?"}
        </label>
        <input
          ref={inputRef}
          id={idPrefix}
          className="input input-lg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.target.scrollIntoView({ block: "center", behavior: "smooth" })}
          onKeyDown={(e) => {
            // Enter logs it, whatever the browser thinks about implicit
            // form submission.
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={type === "event" ? "Dentist, 4pm" : "Capture a thought…"}
          autoComplete="off"
        />
      </div>

      {!text && (
        <div className="row gap-2 wrap">
          <span className="meta">Routines</span>
          {ROUTINES.map((routine) => (
            <button key={routine.id} type="button" className="chip" onClick={() => applyRoutine(routine)}>
              <span aria-hidden="true">↻</span>
              {routine.text} · {describeRepeat(routine.repeat).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {/* 3 — details, folded away until they're wanted */}
      {!needsDate && (
        <button
          type="button"
          className="btn btn-ghost"
          aria-expanded={detailsOpen}
          onClick={() => setShowDetails((open) => !open)}
        >
          {detailsOpen ? "Hide details" : "Add date, repeat or mark"}
        </button>
      )}

      {detailsOpen && (
        <div className="stack gap-4">
          {type === "event" ? (
            <div className="stack gap-3">
              <div className="row gap-3" style={{ alignItems: "flex-end" }}>
                <div className="field grow">
                  <label className="field-label" htmlFor={`${idPrefix}-event-date`}>Date *</label>
                  <input
                    id={`${idPrefix}-event-date`}
                    className="input"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
                <div className="field grow">
                  <label className="field-label" htmlFor={`${idPrefix}-event-time`}>Time</label>
                  <input
                    id={`${idPrefix}-event-time`}
                    className="input"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor={`${idPrefix}-event-location`}>Where</label>
                <input
                  id={`${idPrefix}-event-location`}
                  className="input"
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          ) : (
            isDatedType(type) && (
              <div className="field">
                <label className="field-label" htmlFor={`${idPrefix}-due-date`}>Due date</label>
                <input
                  id={`${idPrefix}-due-date`}
                  className="input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            )
          )}

          {isDatedType(type) && (
            <div className="stack gap-2">
              <RepeatPicker value={repeat} onChange={setRepeat} idPrefix={idPrefix} />
              {repeat && type !== "event" && !dueDate && (
                <p className="meta">Starts today. Tick it off and the next one is written for you.</p>
              )}
              {repeat && (dueDate || type === "event") && (
                <p className="meta">Tick it off and the next one is written for you.</p>
              )}
            </div>
          )}

          <fieldset className="stack gap-2" style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
            <legend className="field-label" style={{ padding: 0 }}>Mark</legend>
            <div className="row gap-2 wrap">
              {Object.entries(SIGNIFIERS).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  className="chip"
                  aria-pressed={signifier === key}
                  onClick={() => setSignifier(key)}
                >
                  {meta.char && <span aria-hidden="true">{meta.char}</span>}
                  {meta.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {/* 4 — commit */}
      <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
        Log it
      </button>

      {needsDate && !eventDate && <p className="meta">An event needs a date before it can be logged.</p>}
    </form>
  );
}
