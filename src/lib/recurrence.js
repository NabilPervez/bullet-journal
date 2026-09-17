import { toISODate } from "./dates";
import { dateFieldFor } from "./model";

// A repeat rule is { every, unit, anchorDay }:
//   every     — a whole number, 1 or more
//   unit      — "day" | "week" | "month" | "year"
//   anchorDay — the day of the month the rule started on, so a monthly entry
//               that began on the 31st lands on the 31st whenever a month has
//               one, instead of drifting to the 28th after February.
//
// Recurrence works on completion: tick a repeating entry off and the next
// one is written for you, dated forward. Nothing is generated in advance, so
// a repeating entry is only ever one line in the journal at a time.

export const UNITS = ["day", "week", "month", "year"];

export const REPEAT_PRESETS = [
  { id: "none", label: "Never", repeat: null },
  { id: "weekly", label: "Weekly", repeat: { every: 1, unit: "week" } },
  { id: "monthly", label: "Monthly", repeat: { every: 1, unit: "month" } },
  { id: "6-months", label: "Every 6 months", repeat: { every: 6, unit: "month" } },
  { id: "yearly", label: "Yearly", repeat: { every: 1, unit: "year" } },
];

// Ready-made routines for the things people forget precisely because they
// are rare. Oil changes are the canonical one.
export const ROUTINES = [
  { id: "oil-change", text: "Oil change", type: "task", repeat: { every: 6, unit: "month" } },
];

export function normalizeRepeat(repeat) {
  if (!repeat || typeof repeat !== "object") return null;
  const every = Math.floor(Number(repeat.every));
  if (!Number.isFinite(every) || every < 1) return null;
  if (!UNITS.includes(repeat.unit)) return null;
  const anchorDay = Number(repeat.anchorDay);
  return {
    every: Math.min(every, 999),
    unit: repeat.unit,
    ...(Number.isInteger(anchorDay) && anchorDay >= 1 && anchorDay <= 31 ? { anchorDay } : {}),
  };
}

export function presetFor(repeat) {
  const r = normalizeRepeat(repeat);
  if (!r) return "none";
  const match = REPEAT_PRESETS.find((p) => p.repeat && p.repeat.every === r.every && p.repeat.unit === r.unit);
  return match ? match.id : "custom";
}

export function describeRepeat(repeat) {
  const r = normalizeRepeat(repeat);
  if (!r) return "";
  if (r.every === 1) {
    return { day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" }[r.unit];
  }
  return `Every ${r.every} ${r.unit}s`;
}

// Attach the day-of-month anchor from the date the rule starts on.
export function anchorRepeat(repeat, iso) {
  const r = normalizeRepeat(repeat);
  if (!r) return null;
  if (r.unit !== "month" && r.unit !== "year") return r;
  const day = Number(String(iso).split("-")[2]);
  return Number.isInteger(day) ? { ...r, anchorDay: day } : r;
}

export function addInterval(iso, repeat) {
  const r = normalizeRepeat(repeat);
  if (!r) return iso;
  const [y, m, d] = iso.split("-").map(Number);

  if (r.unit === "day") return toISODate(new Date(y, m - 1, d + r.every));
  if (r.unit === "week") return toISODate(new Date(y, m - 1, d + 7 * r.every));

  const months = r.unit === "year" ? r.every * 12 : r.every;
  const targetMonth = m - 1 + months;
  const lastDay = new Date(y, targetMonth + 1, 0).getDate();
  const wanted = r.anchorDay ?? d;
  return toISODate(new Date(y, targetMonth, Math.min(wanted, lastDay)));
}

// The next date for a repeating entry, counted from its own schedule rather
// than from when it was ticked, so the cadence stays fixed. It always lands
// after today: finishing a monthly task three months late gives next month,
// not three overdue copies.
export function nextOccurrence(entry, todayISO) {
  const field = dateFieldFor(entry.type);
  const start = field ? entry[field] : null;
  if (!start || !normalizeRepeat(entry.repeat)) return null;

  let next = addInterval(start, entry.repeat);
  for (let guard = 0; next <= todayISO && guard < 5000; guard += 1) {
    next = addInterval(next, entry.repeat);
  }
  return next;
}
