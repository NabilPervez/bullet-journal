import { describe, it, expect } from "vitest";
import { migrate, SCHEMA_VERSION } from "./migrations";
import { entryRelevantDate } from "./model";

describe("v0 → v1", () => {
  it("backfills createdAt from the date the entry is filed under", () => {
    const { entries } = migrate({ entries: [{ id: "a", text: "Renew passport", type: "task", dueDate: "2026-10-02" }], blocks: [] }, 0);
    expect(entries[0].createdAt).toBeGreaterThan(0);
    // Noon local, so the fallback date cannot slide a day either way.
    expect(entryRelevantDate({ ...entries[0], dueDate: null })).toBe("2026-10-02");
  });

  it("gives an entry with nothing to go on the current time", () => {
    const before = Date.now();
    const { entries } = migrate({ entries: [{ id: "a", text: "A thought", type: "note" }], blocks: [] }, 0);
    expect(entries[0].createdAt).toBeGreaterThanOrEqual(before);
  });

  it("fills in every field so consumers can read them unconditionally", () => {
    const { entries } = migrate({ entries: [{ id: "a", text: "x", type: "task", createdAt: 5 }], blocks: [] }, 0);
    expect(entries[0]).toMatchObject({
      done: false, signifier: null, dueDate: null, eventDate: null, eventTime: null, eventLocation: null,
    });
  });

  it("falls back to note for an unknown type", () => {
    const { entries } = migrate({ entries: [{ id: "a", text: "x", type: "sketch", createdAt: 5 }], blocks: [] }, 0);
    expect(entries[0].type).toBe("note");
  });

  it("drops blocks whose entry is gone", () => {
    const { blocks } = migrate({
      entries: [{ id: "a", text: "x", type: "task", createdAt: 5 }],
      blocks: [
        { id: "b1", entryId: "a", date: "2026-09-20", startMinute: 0, durationMinutes: 30 },
        { id: "b2", entryId: "deleted", date: "2026-09-20", startMinute: 60, durationMinutes: 30 },
      ],
    }, 0);
    expect(blocks.map((b) => b.id)).toEqual(["b1"]);
  });

  it("keeps one block per entry", () => {
    const { blocks, entries } = migrate({
      entries: [{ id: "a", text: "x", type: "task", createdAt: 5, scheduledBlockId: "b2" }],
      blocks: [
        { id: "b1", entryId: "a", date: "2026-09-20", startMinute: 0, durationMinutes: 30 },
        { id: "b2", entryId: "a", date: "2026-09-21", startMinute: 60, durationMinutes: 30 },
      ],
    }, 0);
    expect(blocks).toHaveLength(1);
    expect(entries[0].scheduledBlockId).toBe(blocks[0].id);
  });

  it("clears a pointer to a block that does not exist", () => {
    const { entries } = migrate({
      entries: [{ id: "a", text: "x", type: "task", createdAt: 5, scheduledBlockId: "ghost" }],
      blocks: [],
    }, 0);
    expect(entries[0].scheduledBlockId).toBeNull();
  });

  it("drops duplicate ids rather than rendering two rows for one entry", () => {
    const { entries } = migrate({
      entries: [
        { id: "a", text: "first", type: "task", createdAt: 5 },
        { id: "a", text: "second", type: "task", createdAt: 6 },
      ],
      blocks: [],
    }, 0);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("first");
  });

  it("stamps the schema version", () => {
    expect(migrate({ entries: [], blocks: [] }, 0).version).toBe(SCHEMA_VERSION);
  });

  it("does nothing to data already at the current version", () => {
    const state = { entries: [{ id: "a", text: "x", type: "task", createdAt: 5 }], blocks: [] };
    const result = migrate(state, SCHEMA_VERSION);
    expect(result.applied).toEqual([]);
    expect(result.entries).toBe(state.entries);
  });
});

describe("v1 → v2", () => {
  it("gives every entry an explicit repeat rule and spawn pointer", () => {
    const { entries, version } = migrate({ entries: [{ id: "a", text: "x", type: "task", createdAt: 5 }], blocks: [] }, 1);
    expect(version).toBe(2);
    expect(entries[0]).toMatchObject({ repeat: null, spawnedId: null });
  });

  it("keeps a valid rule and drops a malformed one", () => {
    const { entries } = migrate({
      entries: [
        { id: "a", text: "Oil change", type: "task", createdAt: 5, repeat: { every: 6, unit: "month" } },
        { id: "b", text: "Broken", type: "task", createdAt: 5, repeat: { every: -1, unit: "eon" } },
      ],
      blocks: [],
    }, 1);
    expect(entries[0].repeat).toEqual({ every: 6, unit: "month" });
    expect(entries[1].repeat).toBeNull();
  });
});
