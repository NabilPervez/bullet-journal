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

// How far ahead an open entry sits. Each horizon covers the days after the
// one before it, so nothing falls between two sections. Overdue counts as
// today: it is still waiting on you, and hiding it further down helps no one.
export const HORIZONS = [
  { id: "today", label: "Today", maxDays: 0 },
  { id: "week", label: "1 week out", maxDays: 7 },
  { id: "twoWeeks", label: "2 weeks out", maxDays: 14 },
  { id: "month", label: "1 month out", maxDays: 30 },
  { id: "future", label: "Future", maxDays: Infinity },
];

// Whole calendar days between two ISO dates. UTC so a clock change can't
// turn a day into 23 hours and round it the wrong way.
function daysBetween(fromISO, toISO) {
  const utc = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(toISO) - utc(fromISO)) / 86400000);
}

function ownDate(entry) {
  const dated =
    (entry.type === "event" && entry.eventDate) ||
    ((entry.type === "task" || entry.type === "goal") && entry.dueDate);
  return dated ? entryRelevantDate(entry) : null;
}

// Undated work has no deadline pressing on it, so it waits in Future.
export function horizonOf(dateISO, todayISO) {
  if (!dateISO) return "future";
  const days = daysBetween(todayISO, dateISO);
  return HORIZONS.find((h) => days <= h.maxDays).id;
}

function byMostRecentlyCompleted(a, b) {
  return (b.completedAt ?? 0) - (a.completedAt ?? 0) || bySoonest(a, b);
}

// Today's log: open entries by how far away they are, then everything
// ticked off. A completed entry leaves its section — the open list only
// ever shows what is still to do. Ticking off a repeating entry writes its
// next occurrence as a new open entry, so that one lands in its own horizon.
export function groupForDay(entries, todayISO) {
  const open = Object.fromEntries(HORIZONS.map((h) => [h.id, []]));
  const done = [];

  for (const entry of entries) {
    if (entry.done) done.push(entry);
    else open[horizonOf(ownDate(entry), todayISO)].push(entry);
  }

  return {
    sections: HORIZONS.map((h) => ({
      id: h.id,
      label: h.label,
      count: open[h.id].length,
      groups: bundle(open[h.id]),
    })),
    completed: { count: done.length, items: done.sort(byMostRecentlyCompleted) },
  };
}
