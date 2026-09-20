import { addInterval, normalizeRepeat } from "./recurrence";
import { dateFieldFor } from "./model";

// A repeating entry is one real line in the journal that moves forward as you
// tick it off. That keeps the data honest — you never accumulate a hundred
// unticked copies of "oil change" — but it also means the calendar looked
// empty beyond the next one.
//
// So the calendar views ask for *projections*: read-only previews of where a
// repeating entry will land. They are computed on the fly, never stored, and
// disappear the moment the rule changes.

const MAX_OCCURRENCES = 60;

export function isProjection(entry) {
  return Boolean(entry?.projected);
}

// Where `entry` falls between two dates, not counting the real occurrence
// itself.
export function occurrencesBetween(entry, startISO, endISO, { max = MAX_OCCURRENCES } = {}) {
  const repeat = normalizeRepeat(entry?.repeat);
  const field = dateFieldFor(entry?.type);
  const anchor = field ? entry[field] : null;
  if (!repeat || !anchor || !startISO || !endISO || endISO < startISO) return [];

  const dates = [];
  let cursor = anchor;

  for (let guard = 0; guard < 5000 && dates.length < max; guard += 1) {
    cursor = addInterval(cursor, repeat);
    if (cursor > endISO) break;
    if (cursor >= startISO) dates.push(cursor);
  }

  return dates;
}

function toProjection(entry, date) {
  const field = dateFieldFor(entry.type);
  return {
    ...entry,
    id: `${entry.id}~${date}`,
    sourceId: entry.id,
    projected: true,
    done: false,
    scheduledBlockId: null,
    spawnedId: null,
    [field]: date,
  };
}

// Every future occurrence of every repeating entry inside a window.
//
// Only the live occurrence of a series projects forward: a ticked-off entry
// has already written its successor, and projecting from both would show the
// same date twice. A ticked-off entry with no successor is a series that
// ended, so it projects nothing at all.
export function projectionsBetween(entries, startISO, endISO, options) {
  const out = [];
  for (const entry of entries) {
    if (!normalizeRepeat(entry.repeat)) continue;
    if (entry.done || entry.spawnedId) continue;
    for (const date of occurrencesBetween(entry, startISO, endISO, options)) {
      out.push(toProjection(entry, date));
    }
  }
  return out;
}
