import { describe, it, expect } from "vitest";
import { groupForDay, bySoonest, scheduleKey, TYPE_ORDER } from "./ordering";

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

describe("groupForDay", () => {
  it("lifts everything due today into its own section", () => {
    const dueToday = entry({ type: "task", dueDate: TODAY });
    const eventToday = entry({ type: "event", eventDate: TODAY, eventTime: "10:00" });
    const tomorrow = entry({ type: "task", dueDate: "2026-09-17" });
    const undated = entry({ type: "note" });

    const { due, rest, dueCount } = groupForDay([tomorrow, undated, dueToday, eventToday], TODAY);

    expect(dueCount).toBe(2);
    expect(due.flatMap((g) => g.items).map((e) => e.id)).toEqual([dueToday.id, eventToday.id]);
    expect(rest.flatMap((g) => g.items).map((e) => e.id)).toEqual([tomorrow.id, undated.id]);
  });

  it("bundles each section by kind, in goal / task / event / note order", () => {
    const entries = [
      entry({ type: "note" }),
      entry({ type: "event", eventDate: "2026-10-01" }),
      entry({ type: "task", dueDate: "2026-10-01" }),
      entry({ type: "goal", dueDate: "2026-10-01" }),
    ];
    const { rest } = groupForDay(entries, TODAY);
    expect(rest.map((g) => g.type)).toEqual(TYPE_ORDER);
  });

  it("leaves out kinds that have nothing in them", () => {
    const { rest } = groupForDay([entry({ type: "task", dueDate: "2026-10-01" })], TODAY);
    expect(rest.map((g) => g.type)).toEqual(["task"]);
  });

  it("orders within a kind by how soon it is", () => {
    const near = entry({ type: "task", dueDate: "2026-09-20" });
    const far = entry({ type: "task", dueDate: "2027-01-05" });
    const { rest } = groupForDay([far, near], TODAY);
    expect(rest[0].items.map((e) => e.id)).toEqual([near.id, far.id]);
  });

  it("keeps an undated entry out of the due-today section", () => {
    const { due, rest } = groupForDay([entry({ type: "task" })], TODAY);
    expect(due).toEqual([]);
    expect(rest[0].items).toHaveLength(1);
  });
});
