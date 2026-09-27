import { useState } from "react";
import { uid } from "../lib/model";
import { addSubtask, removeSubtask, subtaskProgress, toggleSubtask } from "../lib/subtasks";

// The items under a task or shopping list. Used live on a row (each tick
// saves straight away) and as a draft in the composer (saved with the entry).
// Enter in the box adds an item and keeps focus there, so a whole list can be
// typed without touching anything else.
export function Checklist({ items, onChange, label, addLabel, placeholder, idPrefix }) {
  const [draft, setDraft] = useState("");
  const { done, total } = subtaskProgress(items);

  function add() {
    const next = addSubtask(items, draft, uid());
    if (next !== items) onChange(next);
    setDraft("");
  }

  return (
    <div className="checklist stack gap-2">
      {total > 0 && (
        <>
          <div className="row gap-2">
            <span className="field-label">{label}</span>
            <span className="meta">{done}/{total}</span>
            <span
              className="checklist-meter"
              role="progressbar"
              aria-label={`${done} of ${total} done`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <span style={{ width: `${(done / total) * 100}%` }} />
            </span>
          </div>
          <ul className="checklist-items" aria-label={label}>
            {items.map((item) => (
              <li key={item.id} className="checklist-item" data-done={item.done ? "true" : "false"}>
                <button
                  type="button"
                  className="checklist-check"
                  role="checkbox"
                  aria-checked={item.done}
                  aria-label={item.done ? `Untick "${item.text}"` : `Tick "${item.text}"`}
                  onClick={() => onChange(toggleSubtask(items, item.id))}
                >
                  <span className="check-box check-box-sm" aria-hidden="true">✓</span>
                </button>
                <span className="checklist-text">{item.text}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm checklist-remove"
                  aria-label={`Remove "${item.text}"`}
                  onClick={() => onChange(removeSubtask(items, item.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="row gap-2">
        <input
          id={idPrefix}
          className="input grow"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Inside the composer's form, Enter here adds an item — it
              // must not log the whole entry half-written.
              e.preventDefault();
              e.stopPropagation();
              add();
            }
          }}
          aria-label={addLabel}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button type="button" className="btn btn-secondary" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}
