// The journal lives in one browser profile and nowhere else. Nudge towards a
// copy now and then, without nagging an empty journal or someone who just
// made one.

export const BACKUP_EVERY_DAYS = 30;
export const SNOOZE_DAYS = 7;
const DAY_MS = 86_400_000;

const LAST_EXPORT_KEY = "marginalia:lastExport";
const SNOOZE_KEY = "marginalia:backupSnoozedUntil";

export function needsBackup({ entryCount, lastExport, snoozedUntil, now }) {
  if (entryCount === 0) return false;
  if (snoozedUntil && snoozedUntil > now) return false;
  if (!lastExport) return true;
  return now - lastExport > BACKUP_EVERY_DAYS * DAY_MS;
}

function readNumber(key) {
  try {
    return Number(localStorage.getItem(key)) || null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Worst case the reminder shows again. Not worth failing over.
  }
}

export function readBackupState() {
  return { lastExport: readNumber(LAST_EXPORT_KEY), snoozedUntil: readNumber(SNOOZE_KEY) };
}

export function markExported(now = Date.now()) {
  write(LAST_EXPORT_KEY, now);
}

export function snoozeBackup(now = Date.now()) {
  write(SNOOZE_KEY, now + SNOOZE_DAYS * DAY_MS);
}
