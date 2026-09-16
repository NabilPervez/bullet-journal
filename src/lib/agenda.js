import { SLOTS_PER_DAY, SLOT_MINUTES } from "./constants";

// On a phone the full 06:00–22:00 grid is two and a half screens of mostly
// empty rows. Show the part of the day that has something in it, with the
// rest one tap away, rather than making the user scroll past 6am to reach 2pm.

export const DEFAULT_FIRST_SLOT = (8 - 6) * (60 / SLOT_MINUTES); // 08:00
export const DEFAULT_LAST_SLOT = (18 - 6) * (60 / SLOT_MINUTES); // 18:00

export function slotOf(startMinute) {
  return Math.floor(startMinute / SLOT_MINUTES);
}

export function lastSlotOf(block) {
  const span = Math.max(1, Math.ceil(block.durationMinutes / SLOT_MINUTES));
  return slotOf(block.startMinute) + span - 1;
}

// Returns the inclusive slot range to render, plus whether anything is hidden
// above or below it.
export function visibleSlotRange(blocks, { expanded = false } = {}) {
  const full = { first: 0, last: SLOTS_PER_DAY - 1, hiddenBefore: 0, hiddenAfter: 0 };
  if (expanded) return full;

  let first = DEFAULT_FIRST_SLOT;
  let last = DEFAULT_LAST_SLOT;

  for (const block of blocks) {
    first = Math.min(first, slotOf(block.startMinute));
    last = Math.max(last, lastSlotOf(block));
  }

  // One empty slot of breathing room at each end, so there is always
  // somewhere to drop something just before or just after the day.
  first = Math.max(0, first - 1);
  last = Math.min(SLOTS_PER_DAY - 1, last + 1);

  return { first, last, hiddenBefore: first, hiddenAfter: SLOTS_PER_DAY - 1 - last };
}
