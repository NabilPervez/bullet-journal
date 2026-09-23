import { SLOTS_PER_DAY, SLOT_MINUTES, START_HOUR } from "./constants";

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function hhmmToStartMinute(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const totalFromMidnight = h * 60 + m;
  const maxStart = SLOTS_PER_DAY * SLOT_MINUTES - SLOT_MINUTES;
  const startMinute = totalFromMidnight - START_HOUR * 60;
  // Off the grid is null, not the nearest edge: a clamped value got written
  // back over the entry and a 23:00 event quietly became 21:30.
  if (startMinute < 0 || startMinute > maxStart) return null;
  return startMinute;
}

export function startMinuteToHHMM(startMinute) {
  const totalFromMidnight = START_HOUR * 60 + startMinute;
  const h = Math.floor(totalFromMidnight / 60);
  const m = totalFromMidnight % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function minutesToLabel(startMinute) {
  const total = START_HOUR * 60 + startMinute;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatDateShort(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTimeShort(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function getMonthInfo(monthOffset) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return {
    year: d.getFullYear(),
    monthIndex: d.getMonth(),
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

export function monthLabelFromKey(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function monthOffsetFromKey(key) {
  const [y, m] = key.split("-").map(Number);
  const now = new Date();
  return y * 12 + (m - 1) - (now.getFullYear() * 12 + now.getMonth());
}

export function daysInMonthCount(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isoFor(year, monthIndex, day) {
  return toISODate(new Date(year, monthIndex, day));
}
