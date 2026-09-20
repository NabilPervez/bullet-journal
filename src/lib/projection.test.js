import { describe, it, expect } from "vitest";
import { occurrencesBetween, projectionsBetween, isProjection } from "./projection";

function entry(over = {}) {
  return {
    id: "oil",
    text: "Oil change",
    type: "task",
    createdAt: 1000,
    done: false,
    dueDate: "2026-09-17",
    eventDate: null,
    eventTime: null,
    repeat: { every: 6, unit: "month" },
    spawnedId: null,
    scheduledBlockId: null,
    ...over,
  };
}

describe("occurrencesBetween", () => {
  it("lists the oil changes across the next three years", () => {
    expect(occurrencesBetween(entry(), "2026-09-18", "2029-09-17")).toEqual([
      "2027-03-17",
      "2027-09-17",
      "2028-03-17",
      "2028-09-17",
      "2029-03-17",
      "2029-09-17",
    ]);
  });

  it("leaves out the real occurrence it counts from", () => {
    expect(occurrencesBetween(entry(), "2026-09-01", "2026-12-31")).not.toContain("2026-09-17");
  });

  it("only returns dates inside the window", () => {
    const dates = occurrencesBetween(entry({ repeat: { every: 1, unit: "week" } }), "2026-10-01", "2026-10-31");
    expect(dates[0]).toBe("2026-10-01");
    expect(dates.at(-1)).toBe("2026-10-29");
  });

  it("uses an event's own date", () => {
    const standup = entry({ type: "event", dueDate: null, eventDate: "2026-09-21", repeat: { every: 1, unit: "week" } });
    expect(occurrencesBetween(standup, "2026-09-22", "2026-10-12")).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
  });

  it("returns nothing without a rule, a date, or a sane window", () => {
    expect(occurrencesBetween(entry({ repeat: null }), "2026-01-01", "2027-01-01")).toEqual([]);
    expect(occurrencesBetween(entry({ dueDate: null }), "2026-01-01", "2027-01-01")).toEqual([]);
    expect(occurrencesBetween(entry(), "2027-01-01", "2026-01-01")).toEqual([]);
  });

  it("caps how many it will generate", () => {
    const daily = entry({ repeat: { every: 1, unit: "day" } });
    expect(occurrencesBetween(daily, "2026-09-18", "2030-01-01", { max: 10 })).toHaveLength(10);
  });
});

describe("projectionsBetween", () => {
  it("marks projections and keeps the text and rule", () => {
    const [first] = projectionsBetween([entry()], "2026-09-18", "2027-12-31");
    expect(isProjection(first)).toBe(true);
    expect(first).toMatchObject({ text: "Oil change", dueDate: "2027-03-17", sourceId: "oil", done: false });
    expect(first.id).not.toBe("oil");
  });

  it("ignores entries that don't repeat", () => {
    expect(projectionsBetween([entry({ repeat: null })], "2026-09-18", "2030-01-01")).toEqual([]);
  });

  it("does not project from an entry that already wrote its successor", () => {
    const done = entry({ done: true, spawnedId: "next" });
    const live = entry({ id: "next", dueDate: "2027-03-17" });
    const dates = projectionsBetween([done, live], "2026-09-18", "2027-12-31").map((p) => p.dueDate);
    expect(dates).toEqual(["2027-09-17"]);
  });

  it("stops projecting once a series has been ticked off for good", () => {
    const finished = entry({ done: true, spawnedId: null });
    expect(projectionsBetween([finished], "2026-09-18", "2030-01-01")).toEqual([]);
  });

  it("keeps each series separate", () => {
    const weekly = entry({ id: "standup", type: "event", dueDate: null, eventDate: "2026-09-21", repeat: { every: 1, unit: "week" } });
    // A window wide enough to contain both cadences.
    const projections = projectionsBetween([entry(), weekly], "2026-09-18", "2027-06-30");
    expect(new Set(projections.map((p) => p.sourceId))).toEqual(new Set(["oil", "standup"]));
    expect(new Set(projections.map((p) => p.id)).size).toBe(projections.length);
  });
});
