import { describe, it, expect } from "vitest";
import {
  addSubtask,
  hasChecklist,
  normalizeSubtasks,
  removeSubtask,
  renameSubtask,
  resetSubtasks,
  subtaskProgress,
  toggleSubtask,
} from "./subtasks";

const list = [
  { id: "a", text: "Milk", done: false },
  { id: "b", text: "Eggs", done: true },
];

describe("hasChecklist", () => {
  it("gives tasks and shopping lists a checklist, and nothing else", () => {
    expect(hasChecklist("task")).toBe(true);
    expect(hasChecklist("shopping")).toBe(true);
    expect(hasChecklist("event")).toBe(false);
    expect(hasChecklist("note")).toBe(false);
  });
});

describe("editing a checklist", () => {
  it("adds an item to the end, trimmed and open", () => {
    expect(addSubtask(list, "  Bread ", "c").at(-1)).toEqual({ id: "c", text: "Bread", done: false });
  });

  it("ignores a blank item", () => {
    expect(addSubtask(list, "   ", "c")).toBe(list);
  });

  it("ticks and unticks one item without touching the rest", () => {
    const next = toggleSubtask(list, "a");
    expect(next.map((s) => s.done)).toEqual([true, true]);
    expect(toggleSubtask(next, "a")[0].done).toBe(false);
  });

  it("removes an item", () => {
    expect(removeSubtask(list, "a").map((s) => s.id)).toEqual(["b"]);
  });

  it("renames an item, and renaming to nothing removes it", () => {
    expect(renameSubtask(list, "a", "Oat milk")[0].text).toBe("Oat milk");
    expect(renameSubtask(list, "a", " ").map((s) => s.id)).toEqual(["b"]);
  });
});

describe("resetSubtasks", () => {
  it("unticks everything and gives each item a fresh id", () => {
    const next = resetSubtasks(list, (i) => `n${i}`);
    expect(next).toEqual([
      { id: "n0", text: "Milk", done: false },
      { id: "n1", text: "Eggs", done: false },
    ]);
  });
});

describe("subtaskProgress", () => {
  it("counts what is ticked", () => {
    expect(subtaskProgress(list)).toEqual({ done: 1, total: 2, complete: false });
    expect(subtaskProgress(toggleSubtask(list, "a")).complete).toBe(true);
  });

  it("treats an empty or missing list as not complete", () => {
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0, complete: false });
    expect(subtaskProgress(undefined).total).toBe(0);
  });
});

describe("normalizeSubtasks", () => {
  it("keeps well-formed items and drops the rest", () => {
    expect(
      normalizeSubtasks([{ id: "a", text: " Milk ", done: 1 }, { id: "b", text: "" }, null, { text: "no id" }])
    ).toEqual([{ id: "a", text: "Milk", done: true }]);
  });

  it("turns anything that isn't a list into an empty one", () => {
    expect(normalizeSubtasks(undefined)).toEqual([]);
    expect(normalizeSubtasks("milk")).toEqual([]);
  });
});
