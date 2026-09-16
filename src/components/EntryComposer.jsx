import { useEffect, useRef, useState } from "react";
import { ENTRY_TYPES, SIGNIFIERS, isDatedType } from "../lib/model";

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
    setShowDetails(false);
  }

  async function submit(event) {
    event?.preventDefault();
    if (!canSubmit) return;
    await addEntry(text.trim(), type, {
      signifier: signifier === "none" ? null : signifier,
      dueDate: isDatedType(type) && type !== "event" && dueDate ? dueDate : null,
      eventDate: type === "event" ? eventDate : null,
      eventTime: type === "event" ? eventTime : null,
      eventLocation: type === "event" ? eventLocation : null,
    });
    reset();
    onDone?.();
  }

  const detailsOpen = showDetails || needsDate;

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

      {/* 3 — details, folded away until they're wanted */}
      {!needsDate && (
        <button
          type="button"
          className="btn btn-ghost"
          aria-expanded={detailsOpen}
          onClick={() => setShowDetails((open) => !open)}
        >
          {detailsOpen ? "Hide details" : "Add date or mark"}
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
