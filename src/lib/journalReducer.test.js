import { describe, it, expect } from "vitest";
import { journalReducer, initialState } from "./journalReducer";

function entry(over = {}) {
  return {
    id: "e1",
    text: "Call the dentist",
    type: "task",
    createdAt: 1000,
    done: false,
    scheduledBlockId: null,
    signifier: null,
    dueDate: null,
    eventDate: null,
    eventTime: null,
    eventLocation: null,
    ...over,
  };
}

function ready(over = {}) {
  return { ...initialState, status: "ready", version: 1, ...over };
}

const add = (state, e, blockId = "b-new") => journalReducer(state, { type: "add-entry", entry: e, blockId });

describe("hydrate", () => {
  it("orders entries newest first and marks the journal ready", () => {
    const next = journalReducer(initialState, {
      type: "hydrate",
      entries: [entry({ id: "old", createdAt: 1 }), entry({ id: "new", createdAt: 9 })],
      blocks: [],
      version: 1,
      readonly: false,
    });
    expect(next.entries.map((e) => e.id)).toEqual(["new", "old"]);
    expect(next.status).toBe("ready");
  });

  it("goes read-only when stored data could not be read", () => {
    const next = journalReducer(initialState, { type: "hydrate", entries: [], blocks: [], version: 0, readonly: true });
    expect(next.status).toBe("readonly");
  });
});

describe("concurrent actions", () => {
  // The bug this reducer exists to fix: two mutators each rebuilt the whole
  // list from the state captured in their render, so the second overwrote the
  // first. Reducing sequentially from the same starting state must keep both.
  it("keeps both entries when two adds are dispatched against one state", () => {
    const start = ready();
    const afterFirst = add(start, entry({ id: "a", createdAt: 1 }), "b-a");
    const afterSecond = add(afterFirst, entry({ id: "b", createdAt: 2 }), "b-b");
    expect(afterSecond.entries.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("keeps both completions when two toggles land in one tick", () => {
    let state = ready({ entries: [entry({ id: "a" }), entry({ id: "b" })] });
    state = journalReducer(state, { type: "toggle-done", id: "a" });
    state = journalReducer(state, { type: "toggle-done", id: "b" });
    expect(state.entries.every((e) => e.done)).toBe(true);
  });
});

describe("add-entry", () => {
  it("puts a timed event straight onto the calendar", () => {
    const next = add(ready(), entry({ id: "ev", type: "event", eventDate: "2026-09-20", eventTime: "09:30" }), "blk");
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0]).toMatchObject({ id: "blk", entryId: "ev", date: "2026-09-20", startMinute: 210 });
    expect(next.entries[0].scheduledBlockId).toBe("blk");
  });

  it("leaves an untimed event unscheduled", () => {
    const next = add(ready(), entry({ id: "ev", type: "event", eventDate: "2026-09-20" }));
    expect(next.blocks).toHaveLength(0);
    expect(next.entries[0].scheduledBlockId).toBeNull();
  });
});

describe("schedule-entry", () => {
  it("moves the existing block instead of orphaning it", () => {
    let state = ready({ entries: [entry({ id: "a" })] });
    state = journalReducer(state, { type: "schedule-entry", entryId: "a", date: "2026-09-20", startMinute: 60, blockId: "b1" });
    state = journalReducer(state, { type: "schedule-entry", entryId: "a", date: "2026-09-21", startMinute: 120, blockId: "b2" });

    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toMatchObject({ id: "b1", date: "2026-09-21", startMinute: 120 });
    expect(state.entries[0].scheduledBlockId).toBe("b1");
  });

  it("keeps an event's own date and time in step with its block", () => {
    let state = ready({ entries: [entry({ id: "ev", type: "event", eventDate: "2026-09-20", eventTime: "08:00" })] });
    state = journalReducer(state, { type: "schedule-entry", entryId: "ev", date: "2026-09-22", startMinute: 180, blockId: "b1" });
    expect(state.entries[0]).toMatchObject({ eventDate: "2026-09-22", eventTime: "09:00" });
  });
});

describe("delete-entry", () => {
  it("takes the entry's blocks with it and offers an undo", () => {
    const state = ready({
      entries: [entry({ id: "a", scheduledBlockId: "b1" })],
      blocks: [{ id: "b1", entryId: "a", date: "2026-09-20", startMinute: 0, durationMinutes: 30 }],
    });
    const next = journalReducer(state, { type: "delete-entry", id: "a" });

    expect(next.entries).toHaveLength(0);
    expect(next.blocks).toHaveLength(0);
    expect(next.undo.label).toContain("Call the dentist");

    const restored = journalReducer(next, { type: "undo" });
    expect(restored.entries).toHaveLength(1);
    expect(restored.blocks).toHaveLength(1);
    expect(restored.undo).toBeNull();
  });

  it("ignores an id that is not there", () => {
    const state = ready({ entries: [entry({ id: "a" })] });
    expect(journalReducer(state, { type: "delete-entry", id: "ghost" })).toBe(state);
  });
});

describe("unschedule-block", () => {
  it("clears the entry's pointer so it can be dragged again", () => {
    const state = ready({
      entries: [entry({ id: "a", scheduledBlockId: "b1" })],
      blocks: [{ id: "b1", entryId: "a", date: "2026-09-20", startMinute: 0, durationMinutes: 30 }],
    });
    const next = journalReducer(state, { type: "unschedule-block", blockId: "b1" });
    expect(next.blocks).toHaveLength(0);
    expect(next.entries[0].scheduledBlockId).toBeNull();
  });
});

describe("save status", () => {
  it("clears a previous failure on the next success", () => {
    const failed = journalReducer(ready(), { type: "save-failed", error: new Error("quota") });
    expect(failed.saveError).toBeTruthy();
    expect(journalReducer(failed, { type: "save-ok" }).saveError).toBeNull();
  });
});

describe("recurring entries", () => {
  const today = "2026-09-17";
  const complete = (state, id, extra = {}) =>
    journalReducer(state, { type: "toggle-done", id, today, now: 5000, nextId: "next", nextBlockId: "next-block", ...extra });

  it("writes the next oil change six months on when one is ticked off", () => {
    const oil = entry({ id: "oil", text: "Oil change", dueDate: today, repeat: { every: 6, unit: "month" } });
    const next = complete(ready({ entries: [oil] }), "oil");

    const done = next.entries.find((e) => e.id === "oil");
    const upcoming = next.entries.find((e) => e.id === "next");

    expect(done).toMatchObject({ done: true, spawnedId: "next" });
    expect(upcoming).toMatchObject({ text: "Oil change", done: false, dueDate: "2027-03-17", repeat: { every: 6, unit: "month" } });
    expect(next.undo.label).toContain("Mar 17");
  });

  it("does not write a second copy if the same entry is ticked again", () => {
    const oil = entry({ id: "oil", dueDate: today, repeat: { every: 6, unit: "month" } });
    let state = complete(ready({ entries: [oil] }), "oil");
    state = journalReducer(state, { type: "toggle-done", id: "oil", today });
    state = complete(state, "oil", { nextId: "next-2" });
    expect(state.entries.filter((e) => e.text === oil.text)).toHaveLength(2);
  });

  it("takes the next occurrence back when the tick is undone", () => {
    const oil = entry({ id: "oil", dueDate: today, repeat: { every: 6, unit: "month" } });
    let state = complete(ready({ entries: [oil] }), "oil");
    state = journalReducer(state, { type: "toggle-done", id: "oil", today });

    expect(state.entries.map((e) => e.id)).toEqual(["oil"]);
    expect(state.entries[0]).toMatchObject({ done: false, spawnedId: null });
  });

  it("leaves the next occurrence alone once it has been ticked off itself", () => {
    const weekly = entry({ id: "w", dueDate: today, repeat: { every: 1, unit: "week" } });
    let state = complete(ready({ entries: [weekly] }), "w");
    state = complete(state, "next", { nextId: "after" });
    state = journalReducer(state, { type: "toggle-done", id: "w", today });
    expect(state.entries.some((e) => e.id === "next")).toBe(true);
  });

  it("carries a repeating event's time and block length onto the next one", () => {
    const standup = entry({
      id: "s",
      type: "event",
      eventDate: "2026-09-14",
      eventTime: "09:30",
      scheduledBlockId: "b1",
      repeat: { every: 1, unit: "week" },
    });
    const state = ready({
      entries: [standup],
      blocks: [{ id: "b1", entryId: "s", date: "2026-09-14", startMinute: 210, durationMinutes: 45 }],
    });
    const next = complete(state, "s");

    expect(next.entries.find((e) => e.id === "next")).toMatchObject({ eventDate: "2026-09-21", eventTime: "09:30", scheduledBlockId: "next-block" });
    expect(next.blocks.find((b) => b.id === "next-block")).toMatchObject({ date: "2026-09-21", startMinute: 210, durationMinutes: 45 });
  });

  it("completes a non-repeating entry exactly as before", () => {
    const one = entry({ id: "one", dueDate: today });
    const next = complete(ready({ entries: [one] }), "one");
    expect(next.entries).toHaveLength(1);
    expect(next.entries[0].done).toBe(true);
  });
});
