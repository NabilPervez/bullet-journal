// Sub-tasks: the steps of a task, or the items on a shopping list. They live
// on the entry itself rather than as entries of their own — ticking off
// "milk" shouldn't put a line in the journal, move between horizons, or
// show up on the calendar.

// Kinds that carry a checklist.
export const CHECKLIST_TYPES = ["task", "shopping"];

export function hasChecklist(type) {
  return CHECKLIST_TYPES.includes(type);
}

// Stores offered as one-tap picks for a shopping list. Anything else can be
// typed in.
export const STORES = ["Walmart", "Costco", "Target", "Amazon"];

// Anything malformed is dropped rather than half-kept, so an import from a
// hand-edited file can't put an item with no text on the page.
export function normalizeSubtasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s) => s && typeof s === "object" && s.id && String(s.text ?? "").trim())
    .map((s) => ({ id: String(s.id), text: String(s.text).trim(), done: Boolean(s.done) }));
}

export function addSubtask(list, text, id) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return list;
  return [...list, { id, text: trimmed, done: false }];
}

export function toggleSubtask(list, id) {
  return list.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
}

export function removeSubtask(list, id) {
  return list.filter((s) => s.id !== id);
}

export function renameSubtask(list, id, text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return removeSubtask(list, id);
  return list.map((s) => (s.id === id ? { ...s, text: trimmed } : s));
}

// A repeating list starts fresh: next week's Costco run needs everything
// again. Items keep their ids' shape but get new ones so the two lists never
// share an item.
export function resetSubtasks(list, makeId) {
  return list.map((s, i) => ({ ...s, id: makeId(i), done: false }));
}

export function subtaskProgress(list) {
  const total = list?.length ?? 0;
  const done = list ? list.filter((s) => s.done).length : 0;
  return { done, total, complete: total > 0 && done === total };
}
