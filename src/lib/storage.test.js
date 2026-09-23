// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { JOURNAL_KEY, loadJournal, saveJournal } from "./storage";

beforeEach(() => localStorage.clear());

describe("saveJournal", () => {
  it("writes the journal as one value, so a failed write cannot split entries from blocks", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem");
    saveJournal({ entries: [{ id: "a" }], blocks: [{ id: "b", entryId: "a" }], version: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    expect(JSON.parse(localStorage.getItem(JOURNAL_KEY))).toMatchObject({ version: 2, entries: [{ id: "a" }] });
  });

  it("leaves the previous save intact when the write fails", () => {
    saveJournal({ entries: [{ id: "old" }], blocks: [], version: 2 });
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(saveJournal({ entries: [{ id: "new" }], blocks: [], version: 2 }).ok).toBe(false);
    spy.mockRestore();
    expect(loadJournal().entries).toEqual([{ id: "old" }]);
  });

  it("removes the legacy keys once the combined value is written", () => {
    localStorage.setItem("marginalia:entries", "[]");
    saveJournal({ entries: [], blocks: [], version: 2 });
    expect(localStorage.getItem("marginalia:entries")).toBeNull();
  });
});

describe("loadJournal", () => {
  it("reads journals saved under the old three keys", () => {
    localStorage.setItem("marginalia:entries", JSON.stringify([{ id: "a" }]));
    localStorage.setItem("marginalia:blocks", "[]");
    localStorage.setItem("marginalia:schemaVersion", "1");
    const j = loadJournal();
    expect(j).toMatchObject({ entries: [{ id: "a" }], blocks: [], version: 1, readonly: false });
  });

  it("goes read-only and quarantines a corrupt combined value", () => {
    localStorage.setItem(JOURNAL_KEY, "{not json");
    const j = loadJournal();
    expect(j.readonly).toBe(true);
    expect(Object.keys(localStorage).some((k) => k.startsWith(`${JOURNAL_KEY}:corrupt:`))).toBe(true);
  });
});
