// Persistence. The journal is the only copy of the user's data, so the rule
// here is: never overwrite something we failed to read. A parse failure used
// to fall back to [] and the next save made that permanent.

const PREFIX = "marginalia:";
const ENTRIES_KEY = PREFIX + "entries";
const BLOCKS_KEY = PREFIX + "blocks";
const VERSION_KEY = PREFIX + "schemaVersion";

function readList(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (err) {
    // Private mode, disabled storage, or a locked profile.
    return { ok: false, reason: "unavailable", error: err, value: [] };
  }
  if (raw == null) return { ok: true, value: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false, reason: "corrupt", raw, value: [] };
    return { ok: true, value: parsed };
  } catch (err) {
    return { ok: false, reason: "corrupt", raw, error: err, value: [] };
  }
}

// Keep the unreadable bytes. They are the only trace of the journal left, and
// something may still be recoverable by hand.
function quarantine(key, raw) {
  try {
    localStorage.setItem(`${key}:corrupt:${Date.now()}`, raw ?? "");
  } catch {
    // Nothing further to do — we are already in the failure path.
  }
}

export function loadJournal() {
  const entries = readList(ENTRIES_KEY);
  const blocks = readList(BLOCKS_KEY);

  const damaged = [];
  if (!entries.ok) damaged.push({ key: ENTRIES_KEY, ...entries });
  if (!blocks.ok) damaged.push({ key: BLOCKS_KEY, ...blocks });

  for (const d of damaged) {
    if (d.reason === "corrupt") quarantine(d.key, d.raw);
  }

  let version = 0;
  try {
    const rawVersion = localStorage.getItem(VERSION_KEY);
    if (rawVersion != null) version = Number(rawVersion) || 0;
  } catch {
    version = 0;
  }

  return {
    entries: entries.value,
    blocks: blocks.value,
    version,
    // "readonly" means: show what we have, but do not save over the top of it.
    readonly: damaged.length > 0,
    damaged,
  };
}

export function saveJournal({ entries, blocks, version }) {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
    localStorage.setItem(VERSION_KEY, String(version));
    return { ok: true };
  } catch (err) {
    console.error("Marginalia: save failed", err);
    return { ok: false, error: err };
  }
}

export function exportJournal({ entries, blocks, version }) {
  return JSON.stringify({ app: "marginalia", version, exportedAt: new Date().toISOString(), entries, blocks }, null, 2);
}
