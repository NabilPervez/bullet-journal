import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  toISODate,
  hhmmToStartMinute,
  startMinuteToHHMM,
  minutesToLabel,
  formatDateShort,
  formatTimeShort,
  getMonthInfo,
  monthLabelFromKey,
  monthOffsetFromKey,
  daysInMonthCount,
  isoFor,
} from "./dates";

describe("toISODate", () => {
  it("formats a local date, not a UTC one", () => {
    // 23:30 local on the 5th must stay the 5th, whatever the offset.
    expect(toISODate(new Date(2026, 8, 5, 23, 30))).toBe("2026-09-05");
  });

  it("pads single-digit months and days", () => {
    expect(toISODate(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("hhmmToStartMinute", () => {
  it("returns minutes from the start of the grid window", () => {
    expect(hhmmToStartMinute("06:00")).toBe(0);
    expect(hhmmToStartMinute("06:30")).toBe(30);
    expect(hhmmToStartMinute("12:00")).toBe(360);
  });

  it("returns null for empty or malformed input", () => {
    expect(hhmmToStartMinute("")).toBeNull();
    expect(hhmmToStartMinute(null)).toBeNull();
    expect(hhmmToStartMinute("not-a-time")).toBeNull();
  });

  it("round-trips with startMinuteToHHMM", () => {
    for (const hhmm of ["06:00", "09:30", "13:00", "21:30"]) {
      expect(startMinuteToHHMM(hhmmToStartMinute(hhmm))).toBe(hhmm);
    }
  });

  it("returns null for times outside the grid window instead of clamping", () => {
    expect(hhmmToStartMinute("05:30")).toBeNull();
    expect(hhmmToStartMinute("22:00")).toBeNull();
    expect(hhmmToStartMinute("23:15")).toBeNull();
  });
});

describe("minutesToLabel", () => {
  it("renders 12-hour clock labels", () => {
    expect(minutesToLabel(0)).toBe("6:00 AM");
    expect(minutesToLabel(360)).toBe("12:00 PM");
    expect(minutesToLabel(390)).toBe("12:30 PM");
    expect(minutesToLabel(930)).toBe("9:30 PM");
  });
});

describe("formatTimeShort", () => {
  it("handles midnight and noon as 12", () => {
    expect(formatTimeShort("00:15")).toBe("12:15 AM");
    expect(formatTimeShort("12:05")).toBe("12:05 PM");
  });

  it("returns an empty string for no time", () => {
    expect(formatTimeShort("")).toBe("");
    expect(formatTimeShort(null)).toBe("");
  });
});

describe("formatDateShort", () => {
  it("reads an ISO date without shifting timezone", () => {
    expect(formatDateShort("2026-09-05")).toBe("Sep 5");
  });

  it("returns an empty string for no date", () => {
    expect(formatDateShort("")).toBe("");
  });
});

describe("month helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15, 10, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keys the current month", () => {
    expect(getMonthInfo(0).key).toBe("2026-09");
  });

  it("rolls over a year boundary", () => {
    expect(getMonthInfo(4).key).toBe("2027-01");
    expect(getMonthInfo(-9).key).toBe("2025-12");
  });

  it("labels a key", () => {
    expect(monthLabelFromKey("2026-09")).toBe("September 2026");
  });

  it("inverts getMonthInfo", () => {
    for (const offset of [-13, -1, 0, 1, 11]) {
      expect(monthOffsetFromKey(getMonthInfo(offset).key)).toBe(offset);
    }
  });

  it("counts days, including leap February", () => {
    expect(daysInMonthCount(2026, 1)).toBe(28);
    expect(daysInMonthCount(2028, 1)).toBe(29);
    expect(daysInMonthCount(2026, 8)).toBe(30);
  });

  it("builds an ISO date for a day of a month", () => {
    expect(isoFor(2026, 8, 5)).toBe("2026-09-05");
  });
});
