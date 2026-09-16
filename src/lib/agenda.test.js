import { describe, it, expect } from "vitest";
import { visibleSlotRange, lastSlotOf, slotOf, DEFAULT_FIRST_SLOT, DEFAULT_LAST_SLOT } from "./agenda";
import { SLOTS_PER_DAY } from "./constants";
import { isSwipe, swipeIntent, clampSwipe, SWIPE_THRESHOLD_PX, SWIPE_MAX_PX } from "./gestures";

const block = (startMinute, durationMinutes = 30) => ({ id: "b", entryId: "e", date: "2026-09-15", startMinute, durationMinutes });

describe("slot maths", () => {
  it("maps minutes from the top of the window to slots", () => {
    expect(slotOf(0)).toBe(0);
    expect(slotOf(180)).toBe(6);
  });

  it("counts the last slot a block covers", () => {
    expect(lastSlotOf(block(0, 30))).toBe(0);
    expect(lastSlotOf(block(0, 90))).toBe(2);
    expect(lastSlotOf(block(0, 45))).toBe(1);
  });
});

describe("visibleSlotRange", () => {
  it("shows a working-hours window when the day is empty", () => {
    const range = visibleSlotRange([]);
    expect(range.first).toBe(DEFAULT_FIRST_SLOT - 1);
    expect(range.last).toBe(DEFAULT_LAST_SLOT + 1);
    expect(range.hiddenBefore).toBeGreaterThan(0);
    expect(range.hiddenAfter).toBeGreaterThan(0);
  });

  it("opens up early enough for an early block", () => {
    const range = visibleSlotRange([block(0)]);
    expect(range.first).toBe(0);
    expect(range.hiddenBefore).toBe(0);
  });

  it("opens up late enough for a long evening block", () => {
    const last = (SLOTS_PER_DAY - 1) * 30;
    const range = visibleSlotRange([block(last)]);
    expect(range.last).toBe(SLOTS_PER_DAY - 1);
    expect(range.hiddenAfter).toBe(0);
  });

  it("leaves a spare slot either side of the day's blocks", () => {
    const range = visibleSlotRange([block(120)]); // 08:00, inside the default window
    expect(range.first).toBeLessThan(slotOf(120));
  });

  it("shows everything when expanded", () => {
    expect(visibleSlotRange([], { expanded: true })).toMatchObject({
      first: 0,
      last: SLOTS_PER_DAY - 1,
      hiddenBefore: 0,
      hiddenAfter: 0,
    });
  });
});

describe("swipe gestures", () => {
  it("treats a mostly-vertical movement as a scroll", () => {
    expect(isSwipe(10, 40)).toBe(false);
    expect(isSwipe(40, 10)).toBe(true);
  });

  it("needs a deliberate distance before it acts", () => {
    expect(swipeIntent(SWIPE_THRESHOLD_PX - 1)).toBeNull();
    expect(swipeIntent(-SWIPE_THRESHOLD_PX + 1)).toBeNull();
    expect(swipeIntent(SWIPE_THRESHOLD_PX)).toBe("complete");
    expect(swipeIntent(-SWIPE_THRESHOLD_PX)).toBe("delete");
  });

  it("stops the row sliding off the screen", () => {
    expect(clampSwipe(500)).toBe(SWIPE_MAX_PX);
    expect(clampSwipe(-500)).toBe(-SWIPE_MAX_PX);
    expect(clampSwipe(20)).toBe(20);
  });
});
