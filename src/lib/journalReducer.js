import { DEFAULT_EVENT_DURATION, SLOT_MINUTES } from "./constants";
import { formatDateShort, hhmmToStartMinute, startMinuteToHHMM } from "./dates";
import { dateFieldFor } from "./model";
import { nextOccurrence } from "./recurrence";

// One reducer owns the journal. Every action addresses entities by id and
// derives the next state from the previous one, so two actions dispatched in
// the same tick both land — the old mutators each rebuilt the whole list from
// the props captured in their render, and the second silently won.

export const initialState = {
  entries: [],
  blocks: [],
  status: "loading", // loading | ready | readonly
  version: 0,
  saveError: null,
  undo: null,
};

function sortEntries(entries) {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt);
}

function replaceEntry(entries, id, fn) {
  return entries.map((e) => (e.id === id ? fn(e) : e));
}

// An undo point is the whole pair of lists. They are small, and a snapshot is
// the only restore that stays correct when an action touches both.
function snapshot(state, label) {
  return { label, entries: state.entries, blocks: state.blocks, at: Date.now() };
}

// Events carry their own date and time, so moving their block has to move the
// entry with it or the two disagree.
function syncEventToBlock(entries, entryId, date, startMinute) {
  return replaceEntry(entries, entryId, (e) =>
    e.type === "event" ? { ...e, eventDate: date, eventTime: startMinuteToHHMM(startMinute) } : e
  );
}

export function journalReducer(state, action) {
  switch (action.type) {
    case "hydrate": {
      return {
        ...state,
        entries: sortEntries(action.entries),
        blocks: action.blocks,
        version: action.version,
        status: action.readonly ? "readonly" : "ready",
      };
    }

    case "add-entry": {
      const { entry, blockId } = action;
      let blocks = state.blocks;
      let scheduledBlockId = null;

      // An event with a time is on the calendar by definition.
      if (entry.type === "event" && entry.eventDate && entry.eventTime) {
        const startMinute = hhmmToStartMinute(entry.eventTime);
        if (startMinute !== null) {
          scheduledBlockId = blockId;
          blocks = [
            ...blocks,
            { id: blockId, entryId: entry.id, date: entry.eventDate, startMinute, durationMinutes: DEFAULT_EVENT_DURATION },
          ];
        }
      }

      return { ...state, entries: [{ ...entry, scheduledBlockId }, ...state.entries], blocks };
    }

    case "update-entry": {
      const existing = state.entries.find((e) => e.id === action.id);
      if (!existing) return state;
      const merged = { ...existing, ...action.patch };
      let blocks = state.blocks;

      if (merged.type === "event" && merged.eventDate && merged.eventTime) {
        const startMinute = hhmmToStartMinute(merged.eventTime);
        if (startMinute !== null) {
          const block = state.blocks.find((b) => b.id === merged.scheduledBlockId);
          if (block) {
            blocks = state.blocks.map((b) =>
              b.id === block.id ? { ...b, date: merged.eventDate, startMinute } : b
            );
          } else {
            merged.scheduledBlockId = action.blockId;
            blocks = [
              ...state.blocks,
              {
                id: action.blockId,
                entryId: merged.id,
                date: merged.eventDate,
                startMinute,
                durationMinutes: DEFAULT_EVENT_DURATION,
              },
            ];
          }
        }
      }

      return { ...state, entries: replaceEntry(state.entries, action.id, () => merged), blocks };
    }

    case "toggle-done": {
      const entry = state.entries.find((e) => e.id === action.id);
      if (!entry) return state;

      // Reopening. If ticking this off wrote the next occurrence, take that
      // back too — unless it has been ticked off or edited into its own thing.
      if (entry.done) {
        const child = entry.spawnedId ? state.entries.find((e) => e.id === entry.spawnedId) : null;
        const removeChild = child && !child.done && !child.spawnedId;
        const entries = state.entries
          .filter((e) => !(removeChild && e.id === child.id))
          .map((e) => (e.id === entry.id ? { ...e, done: false, spawnedId: removeChild ? null : e.spawnedId } : e));
        const blocks = removeChild ? state.blocks.filter((b) => b.entryId !== child.id) : state.blocks;
        return { ...state, entries, blocks };
      }

      let entries = replaceEntry(state.entries, entry.id, (e) => ({ ...e, done: true }));
      let blocks = state.blocks;
      let label = `Completed "${entry.text}"`;

      // Completing a repeating entry writes the next one, dated forward.
      const nextDate = entry.spawnedId ? null : nextOccurrence(entry, action.today);
      if (nextDate) {
        const field = dateFieldFor(entry.type);
        const child = {
          ...entry,
          id: action.nextId,
          createdAt: action.now ?? entry.createdAt,
          done: false,
          spawnedId: null,
          scheduledBlockId: null,
          [field]: nextDate,
        };

        if (child.type === "event" && child.eventTime) {
          const startMinute = hhmmToStartMinute(child.eventTime);
          if (startMinute !== null) {
            child.scheduledBlockId = action.nextBlockId;
            const previous = state.blocks.find((b) => b.entryId === entry.id);
            blocks = [
              ...blocks,
              {
                id: action.nextBlockId,
                entryId: child.id,
                date: nextDate,
                startMinute,
                durationMinutes: previous?.durationMinutes ?? DEFAULT_EVENT_DURATION,
              },
            ];
          }
        }

        entries = [child, ...entries.map((e) => (e.id === entry.id ? { ...e, spawnedId: child.id } : e))];
        label = `Done — next "${entry.text}" is due ${formatDateShort(nextDate)}`;
      }

      return { ...state, entries, blocks, undo: snapshot(state, label) };
    }

    case "delete-entry": {
      const entry = state.entries.find((e) => e.id === action.id);
      if (!entry) return state;
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.id),
        blocks: state.blocks.filter((b) => b.entryId !== action.id),
        undo: snapshot(state, `Deleted "${entry.text}"`),
      };
    }

    case "schedule-entry": {
      const entry = state.entries.find((e) => e.id === action.entryId);
      if (!entry) return state;

      // One block per entry. Re-scheduling moves the existing block rather
      // than leaving the old one orphaned on the grid.
      const existing = state.blocks.find((b) => b.entryId === entry.id);
      const blocks = existing
        ? state.blocks.map((b) =>
            b.id === existing.id ? { ...b, date: action.date, startMinute: action.startMinute } : b
          )
        : [
            ...state.blocks,
            {
              id: action.blockId,
              entryId: entry.id,
              date: action.date,
              startMinute: action.startMinute,
              durationMinutes: action.durationMinutes ?? SLOT_MINUTES,
            },
          ];

      const blockId = existing ? existing.id : action.blockId;
      let entries = replaceEntry(state.entries, entry.id, (e) => ({ ...e, scheduledBlockId: blockId }));
      entries = syncEventToBlock(entries, entry.id, action.date, action.startMinute);

      return { ...state, entries, blocks };
    }

    case "move-block": {
      const block = state.blocks.find((b) => b.id === action.blockId);
      if (!block) return state;
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === block.id ? { ...b, date: action.date, startMinute: action.startMinute } : b
        ),
        entries: syncEventToBlock(state.entries, block.entryId, action.date, action.startMinute),
      };
    }

    case "resize-block": {
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId ? { ...b, durationMinutes: action.durationMinutes } : b
        ),
      };
    }

    case "unschedule-block": {
      const block = state.blocks.find((b) => b.id === action.blockId);
      if (!block) return state;
      const entry = state.entries.find((e) => e.id === block.entryId);
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== block.id),
        entries: replaceEntry(state.entries, block.entryId, (e) => ({ ...e, scheduledBlockId: null })),
        undo: snapshot(state, entry ? `Unscheduled "${entry.text}"` : "Unscheduled"),
      };
    }

    case "undo": {
      if (!state.undo) return state;
      return { ...state, entries: state.undo.entries, blocks: state.undo.blocks, undo: null };
    }

    case "dismiss-undo":
      return state.undo ? { ...state, undo: null } : state;

    case "save-ok":
      return state.saveError ? { ...state, saveError: null } : state;

    case "save-failed":
      return { ...state, saveError: action.error ?? new Error("Save failed") };

    default:
      return state;
  }
}
