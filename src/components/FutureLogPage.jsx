import { useMemo, useState } from "react";
import { formatDateShort, getMonthInfo } from "../lib/dates";
import { ENTRY_TYPES, entryRelevantDate, isDatedType } from "../lib/model";
import { projectionsBetween } from "../lib/projection";
import { describeRepeat } from "../lib/recurrence";
import { daysInMonthCount, isoFor } from "../lib/dates";

// Rendered inside the Index page, under the "Ahead" tab.
export function FutureLog({ entries, addEntry }) {
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => getMonthInfo(i)), []);
  const [text, setText] = useState("");
  const [type, setType] = useState("task");
  const [date, setDate] = useState("");
  const canAdd = Boolean(text.trim()) && Boolean(date);

  async function handleAdd(event) {
    event?.preventDefault();
    if (!canAdd) return;
    await addEntry(text.trim(), type, type === "event" ? { eventDate: date } : { dueDate: date });
    setText("");
    setDate("");
  }

  // Every repeating entry's future dates across the twelve months shown, so
  // "every 6 months" is visible as two marks on the year rather than one.
  const projections = useMemo(() => {
    const first = months[0];
    const last = months[months.length - 1];
    return projectionsBetween(
      entries,
      isoFor(first.year, first.monthIndex, 1),
      isoFor(last.year, last.monthIndex, daysInMonthCount(last.year, last.monthIndex))
    );
  }, [entries, months]);

  function itemsForMonth(key) {
    const inMonth = (e) => isDatedType(e.type) && entryRelevantDate(e).startsWith(key);
    return [...entries.filter(inMonth), ...projections.filter(inMonth)].sort((a, b) =>
      entryRelevantDate(a).localeCompare(entryRelevantDate(b))
    );
  }

  return (
    <section aria-label="Future Log" className="stack gap-5">
      <div className="stack gap-1">
        <h2 className="title">Future Log</h2>
        <p className="meta">The next twelve months, at a glance.</p>
      </div>

      <form className="panel stack gap-4" onSubmit={handleAdd}>
        <div className="row gap-2 wrap">
          {Object.keys(ENTRY_TYPES)
            .filter((k) => k !== "note")
            .map((key) => (
              <button
                key={key}
                type="button"
                className="chip"
                data-type={key}
                aria-pressed={type === key}
                onClick={() => setType(key)}
              >
                <span className="chip-glyph" aria-hidden="true">{ENTRY_TYPES[key].glyph}</span>
                {ENTRY_TYPES[key].label}
              </button>
            ))}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="future-text">What's coming up?</label>
          <input
            id="future-text"
            className="input input-lg"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Renew passport…"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="future-date">When</label>
          <input id="future-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={!canAdd}>Add to the future</button>
      </form>

      <div className="grid-future stagger">
        {months.map((m) => {
          const items = itemsForMonth(m.key);
          return (
            <div key={m.key} className="card stack gap-3">
              <div className="row spread gap-2">
                <span className="eyebrow">{m.label}</span>
                {items.length > 0 && <span className="meta">{items.length}</span>}
              </div>

              {items.length === 0 ? (
                <p className="meta" style={{ opacity: 0.6 }}>Nothing yet</p>
              ) : (
                <ul className="stack gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {items.map((e) => (
                    <li key={e.id} className="row gap-2" style={{ alignItems: "flex-start", opacity: e.projected ? 0.65 : 1 }}>
                      <span className="sticker sticker-sm sticker-static" data-type={e.type} aria-hidden="true">
                        {ENTRY_TYPES[e.type].glyph}
                      </span>
                      <span className="grow stack gap-1">
                        <span style={{ fontSize: "var(--fs-body)", overflowWrap: "anywhere" }}>{e.text}</span>
                        <span className="meta">
                          {formatDateShort(entryRelevantDate(e))}
                          {e.projected ? ` · ↻ ${describeRepeat(e.repeat).toLowerCase()}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
