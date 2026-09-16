import { describe, it, expect } from "vitest";
import { toJSON, parseJSON, toMarkdown, EXPORT_FORMAT } from "./transfer";

const entries = [
  { id: "a", text: "Book the dentist", type: "task", createdAt: new Date(2026, 8, 15, 9).getTime(), done: false, signifier: "priority", dueDate: null, eventDate: null, eventTime: null, eventLocation: null },
  { id: "b", text: "Standup", type: "event", createdAt: new Date(2026, 8, 15, 8).getTime(), done: false, signifier: null, eventDate: "2026-09-15", eventTime: "09:00", eventLocation: "Zoom", dueDate: null },
  { id: "c", text: "Ship the migration", type: "goal", createdAt: new Date(2026, 9, 1, 8).getTime(), done: true, signifier: null, dueDate: "2026-10-30", eventDate: null, eventTime: null, eventLocation: null },
];
const blocks = [{ id: "b1", entryId: "b", date: "2026-09-15", startMinute: 180, durationMinutes: 30 }];

describe("JSON round trip", () => {
  it("survives export and re-import unchanged", () => {
    const parsed = parseJSON(toJSON({ entries, blocks, version: 1 }));
    expect(parsed.ok).toBe(true);
    expect(parsed.entries).toEqual(entries);
    expect(parsed.blocks).toEqual(blocks);
    expect(parsed.version).toBe(1);
  });

  it("stamps the format so a foreign file can be refused", () => {
    expect(JSON.parse(toJSON({ entries, blocks, version: 1 })).format).toBe(EXPORT_FORMAT);
  });
});

describe("parseJSON rejects bad input with a reason", () => {
  it("refuses text that is not JSON", () => {
    expect(parseJSON("not json")).toMatchObject({ ok: false });
    expect(parseJSON("not json").error).toMatch(/JSON/);
  });

  it("refuses JSON with no entries", () => {
    expect(parseJSON('{"blocks":[]}')).toMatchObject({ ok: false });
  });

  it("refuses a file from another app", () => {
    expect(parseJSON('{"format":"something-else","entries":[]}')).toMatchObject({ ok: false });
  });

  it("accepts a journal with no blocks key", () => {
    const parsed = parseJSON('{"entries":[],"version":1}');
    expect(parsed).toMatchObject({ ok: true, blocks: [] });
  });
});

describe("Markdown export", () => {
  const md = toMarkdown({ entries });

  it("groups by month and day", () => {
    expect(md).toContain("## September 2026");
    expect(md).toContain("## October 2026");
    // The day heading is locale-formatted, so assert its parts, not an order.
    const heading = md.split("\n").find((line) => line.startsWith("### "));
    expect(heading).toMatch(/Tue/);
    expect(heading).toMatch(/Sep/);
    expect(heading).toMatch(/15/);
  });

  it("keeps tasks as checkboxes, ticked when done", () => {
    expect(md).toContain("- [ ] • ★ Book the dentist");
    expect(md).toContain("- [x] ✦ Ship the migration");
  });

  it("carries an event's time and place", () => {
    expect(md).toContain("- ○ Standup — 9:00 AM, Zoom");
  });

  it("files a dated goal under its due date, not the day it was written", () => {
    const october = md.slice(md.indexOf("## October 2026"));
    expect(october).toContain("Ship the migration");
  });
});
