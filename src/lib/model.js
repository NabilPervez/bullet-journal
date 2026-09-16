import { toISODate } from "./dates";

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ENTRY_TYPES = {
  goal: { glyph: "✦", label: "Goal" },
  task: { glyph: "•", label: "Task" },
  event: { glyph: "○", label: "Event" },
  note: { glyph: "–", label: "Note" },
};

export const SIGNIFIERS = {
  none: { char: "", label: "None" },
  priority: { char: "★", label: "Priority" },
  inspiration: { char: "!", label: "Inspiration" },
};



// The date a given entry is "filed under" for Index / Future / Monthly views
export function entryRelevantDate(entry) {
  if (entry.type === "event" && entry.eventDate) return entry.eventDate;
  if ((entry.type === "task" || entry.type === "goal") && entry.dueDate) return entry.dueDate;
  return toISODate(new Date(entry.createdAt));
}
