import { toISODate } from "./dates";

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ENTRY_TYPES = {
  goal: { glyph: "✦", label: "Goal", plural: "goals" },
  task: { glyph: "•", label: "Task", plural: "tasks" },
  event: { glyph: "○", label: "Event", plural: "events" },
  note: { glyph: "–", label: "Note", plural: "notes" },
};

export const SIGNIFIERS = {
  none: { char: "", label: "None" },
  priority: { char: "★", label: "Priority" },
  inspiration: { char: "!", label: "Inspiration" },
};

// Which date field a type is filed under. Every view that asks "when is this
// for?" reads this rather than re-deriving the rule, which is how goal ended
// up counted in the Index but never displayed.
const DATE_FIELD = {
  goal: "dueDate",
  task: "dueDate",
  event: "eventDate",
  note: null,
};

export function dateFieldFor(type) {
  return DATE_FIELD[type] ?? null;
}

export function isDatedType(type) {
  return dateFieldFor(type) !== null;
}

// Types that can be placed on a calendar or carried forward — everything but
// a note, which is a record of something that already happened.
export const SCHEDULABLE_TYPES = Object.keys(ENTRY_TYPES).filter(isDatedType);

export function isSchedulable(entry) {
  return isDatedType(entry.type);
}

// The date a given entry is "filed under" for Index / Future / Monthly views
export function entryRelevantDate(entry) {
  const field = dateFieldFor(entry.type);
  if (field && entry[field]) return entry[field];
  return toISODate(new Date(entry.createdAt));
}

// Counts keyed by type, with every known type present at zero so a new type
// appears in the Index the moment it is added to ENTRY_TYPES.
export function countByType(entries) {
  const counts = Object.fromEntries(Object.keys(ENTRY_TYPES).map((k) => [k, 0]));
  for (const entry of entries) {
    if (counts[entry.type] === undefined) continue;
    counts[entry.type] += 1;
  }
  return counts;
}

export function summarizeCounts(counts) {
  const parts = [];
  for (const [type, meta] of Object.entries(ENTRY_TYPES)) {
    const n = counts[type] || 0;
    if (n === 0) continue;
    parts.push(`${n} ${n === 1 ? meta.label.toLowerCase() : meta.plural}`);
  }
  return parts.length ? parts.join(" · ") : "nothing yet";
}
