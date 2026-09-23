import { describe, it, expect } from "vitest";
import { BACKUP_EVERY_DAYS, needsBackup } from "./backup";

const DAY = 86_400_000;
const now = 100 * DAY;

describe("needsBackup", () => {
  it("stays quiet for an empty journal", () => {
    expect(needsBackup({ entryCount: 0, lastExport: null, snoozedUntil: null, now })).toBe(false);
  });

  it("asks when a journal has never been exported", () => {
    expect(needsBackup({ entryCount: 3, lastExport: null, snoozedUntil: null, now })).toBe(true);
  });

  it("asks again once the last export is old enough", () => {
    const recent = now - (BACKUP_EVERY_DAYS - 1) * DAY;
    const old = now - (BACKUP_EVERY_DAYS + 1) * DAY;
    expect(needsBackup({ entryCount: 3, lastExport: recent, snoozedUntil: null, now })).toBe(false);
    expect(needsBackup({ entryCount: 3, lastExport: old, snoozedUntil: null, now })).toBe(true);
  });

  it("respects a snooze until it runs out", () => {
    expect(needsBackup({ entryCount: 3, lastExport: null, snoozedUntil: now + DAY, now })).toBe(false);
    expect(needsBackup({ entryCount: 3, lastExport: null, snoozedUntil: now - 1, now })).toBe(true);
  });
});
