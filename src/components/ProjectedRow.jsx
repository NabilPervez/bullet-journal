import { describeRepeat } from "../lib/recurrence";
import { ENTRY_TYPES } from "../lib/model";
import { formatTimeShort } from "../lib/dates";

// A future occurrence of a repeating entry. It doesn't exist in the journal
// yet — it's where the rule says the entry will land — so it reads as a
// ghost: outlined rather than filled, and nothing to tick. It becomes a real
// entry when you complete the one before it.
export function ProjectedRow({ entry }) {
  const meta = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.note;

  return (
    <li className="entry-row">
      <div className="entry-body entry-body-ghost" data-type={entry.type}>
        <span className="check-btn" aria-hidden="true">
          <span className="check-box check-box-ghost">↻</span>
        </span>

        <div className="grow stack gap-2">
          <span className="entry-text entry-text-ghost">{entry.text}</span>
          <div className="row gap-2 wrap">
            <span className="sticker sticker-sm sticker-static" data-type={entry.type} aria-hidden="true">
              {meta.glyph}
            </span>
            {entry.type === "event" && entry.eventTime && (
              <span className="ticket">{formatTimeShort(entry.eventTime)}</span>
            )}
            <span className="ticket" style={{ color: "var(--accent-ink)" }}>
              ↻ {describeRepeat(entry.repeat)}
            </span>
            <span className="meta">Upcoming</span>
          </div>
        </div>
      </div>
    </li>
  );
}
