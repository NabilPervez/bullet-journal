import { describe, it, expect } from "vitest";
import {
  addInterval,
  anchorRepeat,
  describeRepeat,
  nextOccurrence,
  normalizeRepeat,
  presetFor,
  ROUTINES,
} from "./recurrence";

const SIX_MONTHS = { every: 6, unit: "month" };

describe("addInterval", () => {
  it("adds days and weeks across a month boundary", () => {
    expect(addInterval("2026-09-28", { every: 5, unit: "day" })).toBe("2026-10-03");
    expect(addInterval("2026-09-28", { every: 2, unit: "week" })).toBe("2026-10-12");
  });

  it("adds six months for an oil change", () => {
    expect(addInterval("2026-09-17", SIX_MONTHS)).toBe("2027-03-17");
  });

  it("rolls into the next year", () => {
    expect(addInterval("2026-11-15", { every: 3, unit: "month" })).toBe("2027-02-15");
    expect(addInterval("2026-09-17", { every: 1, unit: "year" })).toBe("2027-09-17");
  });

  it("clamps to the last day of a shorter month", () => {
    expect(addInterval("2026-01-31", { every: 1, unit: "month" })).toBe("2026-02-28");
    expect(addInterval("2028-01-31", { every: 1, unit: "month" })).toBe("2028-02-29");
  });

  it("returns to the anchored day once a month is long enough again", () => {
    const monthly = anchorRepeat({ every: 1, unit: "month" }, "2026-01-31");
    const feb = addInterval("2026-01-31", monthly);
    const mar = addInterval(feb, monthly);
    expect(feb).toBe("2026-02-28");
    expect(mar).toBe("2026-03-31");
  });

  it("handles a leap day repeating yearly", () => {
    const yearly = anchorRepeat({ every: 1, unit: "year" }, "2028-02-29");
    expect(addInterval("2028-02-29", yearly)).toBe("2029-02-28");
  });
});

describe("nextOccurrence", () => {
  const today = "2026-09-17";

  it("dates the next oil change six months after the one that was due", () => {
    const entry = { type: "task", dueDate: "2026-09-17", repeat: SIX_MONTHS };
    expect(nextOccurrence(entry, today)).toBe("2027-03-17");
  });

  it("keeps the cadence when something is ticked off early", () => {
    const entry = { type: "task", dueDate: "2026-10-01", repeat: { every: 1, unit: "month" } };
    expect(nextOccurrence(entry, today)).toBe("2026-11-01");
  });

  it("skips forward past today when something was left overdue", () => {
    const entry = { type: "task", dueDate: "2026-05-01", repeat: { every: 1, unit: "month" } };
    expect(nextOccurrence(entry, today)).toBe("2026-10-01");
  });

  it("uses an event's own date", () => {
    const entry = { type: "event", eventDate: "2026-09-14", eventTime: "09:00", repeat: { every: 1, unit: "week" } };
    expect(nextOccurrence(entry, today)).toBe("2026-09-21");
  });

  it("returns nothing for an entry with no date or no rule", () => {
    expect(nextOccurrence({ type: "task", dueDate: null, repeat: SIX_MONTHS }, today)).toBeNull();
    expect(nextOccurrence({ type: "task", dueDate: today, repeat: null }, today)).toBeNull();
    expect(nextOccurrence({ type: "note", repeat: SIX_MONTHS }, today)).toBeNull();
  });
});

describe("rules", () => {
  it("rejects nonsense", () => {
    expect(normalizeRepeat(null)).toBeNull();
    expect(normalizeRepeat({ every: 0, unit: "month" })).toBeNull();
    expect(normalizeRepeat({ every: 2, unit: "fortnight" })).toBeNull();
    expect(normalizeRepeat({ every: "3", unit: "week" })).toEqual({ every: 3, unit: "week" });
  });

  it("describes a rule the way a person would say it", () => {
    expect(describeRepeat({ every: 1, unit: "week" })).toBe("Weekly");
    expect(describeRepeat(SIX_MONTHS)).toBe("Every 6 months");
    expect(describeRepeat({ every: 2, unit: "day" })).toBe("Every 2 days");
    expect(describeRepeat(null)).toBe("");
  });

  it("recognises a preset, or calls it custom", () => {
    expect(presetFor(SIX_MONTHS)).toBe("6-months");
    expect(presetFor({ every: 1, unit: "year", anchorDay: 17 })).toBe("yearly");
    expect(presetFor({ every: 10, unit: "day" })).toBe("custom");
    expect(presetFor(null)).toBe("none");
  });

  it("ships the oil change routine at six months", () => {
    const oil = ROUTINES.find((r) => r.id === "oil-change");
    expect(oil).toMatchObject({ text: "Oil change", type: "task", repeat: SIX_MONTHS });
  });
});
