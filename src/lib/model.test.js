import { describe, it, expect } from "vitest";
import { uid, ENTRY_TYPES, SIGNIFIERS, entryRelevantDate } from "./model";

describe("uid", () => {
  it("does not collide across a burst of calls", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => uid()));
    expect(ids.size).toBe(5000);
  });
});

describe("entry types", () => {
  it("gives every type a glyph and a label", () => {
    for (const [key, meta] of Object.entries(ENTRY_TYPES)) {
      expect(meta.glyph, key).toBeTruthy();
      expect(meta.label, key).toBeTruthy();
    }
  });

  it("includes goal, the type added most recently", () => {
    expect(Object.keys(ENTRY_TYPES)).toContain("goal");
  });

  it("gives every signifier a label", () => {
    for (const [key, meta] of Object.entries(SIGNIFIERS)) {
      expect(meta.label, key).toBeTruthy();
    }
  });
});

describe("entryRelevantDate", () => {
  const createdAt = new Date(2026, 8, 15, 9, 0).getTime();

  it("files an event under its event date", () => {
    expect(entryRelevantDate({ type: "event", eventDate: "2026-10-02", createdAt })).toBe("2026-10-02");
  });

  it("files a task and a goal under their due date", () => {
    expect(entryRelevantDate({ type: "task", dueDate: "2026-10-02", createdAt })).toBe("2026-10-02");
    expect(entryRelevantDate({ type: "goal", dueDate: "2026-11-30", createdAt })).toBe("2026-11-30");
  });

  it("falls back to the creation date when undated", () => {
    expect(entryRelevantDate({ type: "task", createdAt })).toBe("2026-09-15");
    expect(entryRelevantDate({ type: "note", createdAt })).toBe("2026-09-15");
  });

  // Known P2: an entry without createdAt yields "Invalid Date", which then
  // becomes a month key in the Index. Sprint 1 backfills it in a migration.
  it.todo("returns a usable date for an entry with no createdAt");
});
