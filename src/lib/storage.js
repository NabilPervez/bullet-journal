// Persistence. The journal is the only copy of the user's data, so the rule
// here is: never overwrite something we failed to read. A parse failure used
// to fall back to [] and the next save made that permanent.

const PREFIX = "marginalia:";

// The whole journal lives under one key, so a save either lands or doesn't.
// It used to be three keys written in turn, and a quota error between them
// left entries and blocks out of step.
export const JOURNAL_KEY = PREFIX + "journal";

// Read-only now: journals saved before the single key still open.
const LEGACY_ENTRIES_KEY = PREFIX + "entries";
const LEGACY_BLOCKS_KEY = PREFIX + "blocks";
const LEGACY_VERSION_KEY = PREFIX + "schemaVersion";

function readRaw(key) {
  try {
    return { ok: true, raw: localStorage.getItem(key) };
  } catch (err) {
    // Private mode, disabled storage, or a locked profile.
    return { ok: false, reason: "unavailable", error: err };
  }
}

function readList(key) {
  const read = readRaw(key);
  if (!read.ok) return { ...read, value: [] };
  const { raw } = read;
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

function result(entries, blocks, version, damaged) {
  for (const d of damaged) {
    if (d.reason === "corrupt") quarantine(d.key, d.raw);
  }
  return {
    entries,
    blocks,
    version,
    // "readonly" means: show what we have, but do not save over the top of it.
    readonly: damaged.length > 0,
    damaged,
  };
}

function loadLegacy() {
  const entries = readList(LEGACY_ENTRIES_KEY);
  const blocks = readList(LEGACY_BLOCKS_KEY);

  const damaged = [];
  if (!entries.ok) damaged.push({ key: LEGACY_ENTRIES_KEY, ...entries });
  if (!blocks.ok) damaged.push({ key: LEGACY_BLOCKS_KEY, ...blocks });

  const rawVersion = readRaw(LEGACY_VERSION_KEY);
  const version = rawVersion.ok && rawVersion.raw != null ? Number(rawVersion.raw) || 0 : 0;

  return result(entries.value, blocks.value, version, damaged);
}

export function loadJournal() {
  const read = readRaw(JOURNAL_KEY);
  if (!read.ok) return result([], [], 0, [{ key: JOURNAL_KEY, ...read }]);
  if (read.raw == null) return loadLegacy();

  try {
    const data = JSON.parse(read.raw);
    if (!data || !Array.isArray(data.entries) || !Array.isArray(data.blocks)) throw new Error("Not a journal");
    return result(data.entries, data.blocks, Number(data.version) || 0, []);
  } catch (err) {
    return result([], [], 0, [{ key: JOURNAL_KEY, reason: "corrupt", raw: read.raw, error: err }]);
  }
}

export function saveJournal({ entries, blocks, version }) {
  const text = JSON.stringify({ version, entries, blocks });
  try {
    // Writing an unchanged journal would still wake every other open tab.
    if (localStorage.getItem(JOURNAL_KEY) === text) return { ok: true };
    localStorage.setItem(JOURNAL_KEY, text);
  } catch (err) {
    console.error("Marginalia: save failed", err);
    return { ok: false, error: err };
  }
  try {
    localStorage.removeItem(LEGACY_ENTRIES_KEY);
    localStorage.removeItem(LEGACY_BLOCKS_KEY);
    localStorage.removeItem(LEGACY_VERSION_KEY);
  } catch {
    // The journal is saved; stale legacy keys are ignored once it exists.
  }
  return { ok: true };
}

// True when a storage event from another tab touched the journal.
export function isJournalKey(key) {
  return key === JOURNAL_KEY || key === null;
}

export function exportJournal({ entries, blocks, version }) {
  return JSON.stringify({ app: "marginalia", version, exportedAt: new Date().toISOString(), entries, blocks }, null, 2);
}
