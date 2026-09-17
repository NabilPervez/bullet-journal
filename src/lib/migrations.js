import { toISODate } from "./dates";
import { ENTRY_TYPES, dateFieldFor } from "./model";
import { normalizeRepeat } from "./recurrence";

export const SCHEMA_VERSION = 2;

// Every entry carries the same keys whatever its type, so a consumer can read
// entry.dueDate without first knowing what it is looking at.
const ENTRY_SHAPE = {
  id: null,
  text: "",
  type: "note",
  createdAt: 0,
  done: false,
  scheduledBlockId: null,
  signifier: null,
  dueDate: null,
  eventDate: null,
  eventTime: null,
  eventLocation: null,
  // A repeat rule, and — once a repeating entry is ticked off — the id of the
  // next occurrence it wrote, so unticking can take that back.
  repeat: null,
  spawnedId: null,
};

function noonOf(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

// v0 → v1: entries written before this version could be missing createdAt,
// which made entryRelevantDate return "Invalid Date" and poison the Index.
function toV1(state) {
  const now = Date.now();
  const seenIds = new Set();

  const entries = state.entries
    .filter((e) => e && typeof e === "object")
    .map((raw) => {
      const type = ENTRY_TYPES[raw.type] ? raw.type : "note";
      const entry = { ...ENTRY_SHAPE, ...raw, type };

      if (!Number.isFinite(entry.createdAt) || entry.createdAt <= 0) {
        // Best available stand-in, in order: the date it was filed under, then now.
        const dated = dateFieldFor(type) ? entry[dateFieldFor(type)] : null;
        entry.createdAt = (dated && noonOf(dated)) || now;
      }

      if (!entry.id) entry.id = `migrated-${entry.createdAt}-${Math.random().toString(36).slice(2, 8)}`;
      entry.done = Boolean(entry.done);
      entry.text = String(entry.text ?? "");
      return entry;
    })
    .filter((e) => {
      if (seenIds.has(e.id)) return false;
      seenIds.add(e.id);
      return true;
    });

  const byId = new Map(entries.map((e) => [e.id, e]));

  // Drop blocks whose entry is gone, and any second block for an entry that
  // already has one — scheduleEntry could create those and orphan the first.
  const claimed = new Set();
  const blocks = state.blocks
    .filter((b) => b && typeof b === "object" && b.id && byId.has(b.entryId))
    .filter((b) => {
      if (claimed.has(b.entryId)) return false;
      claimed.add(b.entryId);
      return true;
    })
    .map((b) => ({
      id: b.id,
      entryId: b.entryId,
      date: b.date,
      startMinute: Number(b.startMinute) || 0,
      durationMinutes: Number(b.durationMinutes) || 30,
    }));

  const blockByEntry = new Map(blocks.map((b) => [b.entryId, b]));
  for (const entry of entries) {
    const block = blockByEntry.get(entry.id);
    // A pointer to a block that no longer exists reads as "scheduled" forever
    // and blocks the entry from being dragged again.
    entry.scheduledBlockId = block ? block.id : null;
  }

  return { entries, blocks };
}

// v1 → v2: recurring entries. Existing entries get an explicit empty rule;
// anything malformed is dropped rather than half-applied.
function toV2(state) {
  return {
    entries: state.entries.map((e) => ({
      ...e,
      repeat: normalizeRepeat(e.repeat),
      spawnedId: e.spawnedId ?? null,
    })),
    blocks: state.blocks,
  };
}

const MIGRATIONS = [
  { to: 1, run: toV1 },
  { to: 2, run: toV2 },
];

export function migrate(state, fromVersion = 0) {
  let current = { entries: state.entries ?? [], blocks: state.blocks ?? [] };
  const applied = [];

  for (const step of MIGRATIONS) {
    if (fromVersion < step.to) {
      current = step.run(current);
      applied.push(step.to);
    }
  }

  return { ...current, version: SCHEMA_VERSION, applied };
}

// Exported for the tests and for anything that needs today's ISO date.
export { toISODate };
