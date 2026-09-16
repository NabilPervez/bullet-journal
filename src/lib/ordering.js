import { ENTRY_TYPES, entryRelevantDate } from "./model";

// The order entries are bundled in. Goals frame the day, tasks are the work,
// events are fixed points, notes are the record.
export const TYPE_ORDER = ["goal", "task", "event", "note"];

// A sortable key: the date an entry is filed under, plus its time if it has
// one. Anything undated sorts after everything dated — no date means no
// deadline pressing on it.
export function scheduleKey(entry) {
  const date = entryRelevantDate(entry);
  const dated =
    (entry.type === "event" && entry.eventDate) ||
    ((entry.type === "task" || entry.type === "goal") && entry.dueDate);

  if (!dated) return "9999-99-99 99:99";
  return `${date} ${entry.type === "event" && entry.eventTime ? entry.eventTime : "00:00"}`;
}

export function bySoonest(a, b) {
  const keyA = scheduleKey(a);
  const keyB = scheduleKey(b);
  if (keyA !== keyB) return keyA.localeCompare(keyB);
  // Same moment: newest written first, so a just-added line is visible.
  return (b.createdAt ?? 0) - (a.createdAt ?? 0);
}

function bundle(entries) {
  return TYPE_ORDER.map((type) => ({
    type,
    label: ENTRY_TYPES[type].label,
    glyph: ENTRY_TYPES[type].glyph,
    items: entries.filter((e) => e.type === type).sort(bySoonest),
  })).filter((group) => group.items.length > 0);
}

// Today's log in two parts: what is due today, then everything else in the
// order it is coming at you — soonest at the top, furthest down the page.
export function groupForDay(entries, todayISO) {
  const due = [];
  const rest = [];

  for (const entry of entries) {
    const hasOwnDate =
      (entry.type === "event" && entry.eventDate) ||
      ((entry.type === "task" || entry.type === "goal") && entry.dueDate);

    if (hasOwnDate && entryRelevantDate(entry) === todayISO) due.push(entry);
    else rest.push(entry);
  }

  return { due: bundle(due), rest: bundle(rest), dueCount: due.length };
}
