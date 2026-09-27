import { describe, it, expect } from "vitest";
import { groupForDay, bySoonest, scheduleKey, horizonOf, TYPE_ORDER } from "./ordering";

const TODAY = "2026-09-16";

let seq = 0;
function entry(over = {}) {
  seq += 1;
  return {
    id: `e${seq}`,
    text: `entry ${seq}`,
    type: "task",
    createdAt: new Date(2026, 8, 16, 9).getTime(),
    done: false,
    signifier: null,
    dueDate: null,
    eventDate: null,
    eventTime: null,
    eventLocation: null,
    scheduledBlockId: null,
    ...over,
  };
}

describe("scheduleKey", () => {
  it("puts an event's time into the key", () => {
    expect(scheduleKey(entry({ type: "event", eventDate: TODAY, eventTime: "14:30" }))).toBe("2026-09-16 14:30");
  });

  it("treats a dated task as the start of its day", () => {
    expect(scheduleKey(entry({ type: "task", dueDate: TODAY }))).toBe("2026-09-16 00:00");
  });

  it("sorts anything undated after everything dated", () => {
    const undated = scheduleKey(entry({ type: "note" }));
    expect(undated > scheduleKey(entry({ type: "task", dueDate: "2099-12-31" }))).toBe(true);
  });
});

describe("bySoonest", () => {
  it("puts the nearest thing first and the furthest last", () => {
    const soon = entry({ type: "task", dueDate: "2026-09-17" });
    const later = entry({ type: "task", dueDate: "2026-11-02" });
    const undated = entry({ type: "task" });

    expect([later, undated, soon].sort(bySoonest).map((e) => e.id)).toEqual([soon.id, later.id, undated.id]);
  });

  it("orders two events on one day by time", () => {
    const nine = entry({ type: "event", eventDate: TODAY, eventTime: "09:00" });
    const four = entry({ type: "event", eventDate: TODAY, eventTime: "16:00" });
    expect([four, nine].sort(bySoonest).map((e) => e.id)).toEqual([nine.id, four.id]);
  });
});

describe("horizonOf", () => {
  it.each([
    ["2026-09-10", "today"], // overdue stays in front of you
    ["2026-09-16", "today"],
    ["2026-09-17", "week"],
    ["2026-09-23", "week"],
    ["2026-09-24", "twoWeeks"],
    ["2026-09-30", "twoWeeks"],
    ["2026-10-01", "month"],
    ["2026-10-16", "month"],
    ["2026-10-17", "future"],
    [null, "future"],
  ])("files %s under %s", (date, horizon) => {
    expect(horizonOf(date, TODAY)).toBe(horizon);
  });

  it("counts calendar days across a month and a DST change", () => {
    expect(horizonOf("2026-11-08", "2026-11-01")).toBe("week");
  });
});

describe("groupForDay", () => {
  const ids = (section) => section.groups.flatMap((g) => g.items).map((e) => e.id);
  const byId = (sections) => Object.fromEntries(sections.map((s) => [s.id, s]));

  it("files open entries into today / 1 week / 2 weeks / 1 month / future", () => {
    const overdue = entry({ type: "task", dueDate: "2026-09-12" });
    const dueToday = entry({ type: "task", dueDate: TODAY });
    const eventToday = entry({ type: "event", eventDate: TODAY, eventTime: "10:00" });
    const tomorrow = entry({ type: "task", dueDate: "2026-09-17" });
    const tenDays = entry({ type: "goal", dueDate: "2026-09-26" });
    const threeWeeks = entry({ type: "event", eventDate: "2026-10-07" });
    const later = entry({ type: "task", dueDate: "2027-01-01" });
    const undated = entry({ type: "note" });

    const { sections, completed } = groupForDay(
      [later, undated, tomorrow, dueToday, threeWeeks, eventToday, tenDays, overdue],
      TODAY
    );
    const s = byId(sections);

    expect(sections.map((x) => x.id)).toEqual(["today", "week", "twoWeeks", "month", "future"]);
    expect(ids(s.today)).toEqual([overdue.id, dueToday.id, eventToday.id]);
    expect(ids(s.week)).toEqual([tomorrow.id]);
    expect(ids(s.twoWeeks)).toEqual([tenDays.id]);
    expect(ids(s.month)).toEqual([threeWeeks.id]);
    expect(ids(s.future)).toEqual([later.id, undated.id]);
    expect(completed.count).toBe(0);
  });

  it("moves a completed entry out of its section and into Completed", () => {
    const done = entry({ type: "task", dueDate: TODAY, done: true });
    const open = entry({ type: "task", dueDate: TODAY });
    const { sections, completed } = groupForDay([done, open], TODAY);

    expect(ids(byId(sections).today)).toEqual([open.id]);
    expect(completed.items.map((e) => e.id)).toEqual([done.id]);
  });

  it("puts a completed repeating entry in Completed while its next occurrence stays open", () => {
    const ticked = entry({ type: "task", dueDate: TODAY, done: true, repeat: { every: 1, unit: "week" }, spawnedId: "next" });
    const next = entry({ id: "next", type: "task", dueDate: "2026-09-23", repeat: { every: 1, unit: "week" } });
    const { sections, completed } = groupForDay([ticked, next], TODAY);

    expect(ids(byId(sections).week)).toEqual([next.id]);
    expect(completed.items.map((e) => e.id)).toEqual([ticked.id]);
  });

  it("lists the most recently completed first", () => {
    const earlier = entry({ done: true, completedAt: 1000 });
    const latest = entry({ done: true, completedAt: 5000 });
    const legacy = entry({ done: true }); // ticked before completedAt existed
    const { completed } = groupForDay([earlier, legacy, latest], TODAY);
    expect(completed.items.map((e) => e.id)).toEqual([latest.id, earlier.id, legacy.id]);
  });

  it("bundles each section by kind, in goal / task / shopping / event / note order", () => {
    const entries = [
      entry({ type: "note" }),
      entry({ type: "shopping", dueDate: "2027-10-01" }),
      entry({ type: "event", eventDate: "2027-10-01" }),
      entry({ type: "task", dueDate: "2027-10-01" }),
      entry({ type: "goal", dueDate: "2027-10-01" }),
    ];
    const future = byId(groupForDay(entries, TODAY).sections).future;
    expect(future.groups.map((g) => g.type)).toEqual(TYPE_ORDER);
  });

  it("orders within a kind by how soon it is", () => {
    const near = entry({ type: "task", dueDate: "2026-12-20" });
    const far = entry({ type: "task", dueDate: "2027-01-05" });
    const future = byId(groupForDay([far, near], TODAY).sections).future;
    expect(future.groups[0].items.map((e) => e.id)).toEqual([near.id, far.id]);
  });

  it("keeps empty sections with a zero count so the page shape is stable", () => {
    const { sections } = groupForDay([], TODAY);
    expect(sections.every((x) => x.count === 0 && x.groups.length === 0)).toBe(true);
  });
});
