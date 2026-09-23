import { entryRelevantDate, ENTRY_TYPES, SIGNIFIERS } from "./model";
import { formatTimeShort, monthLabelFromKey } from "./dates";
import { describeRepeat } from "./recurrence";

export const EXPORT_FORMAT = "marginalia-journal";

// A journal you cannot get out of the app is a journal you can lose with one
// cleared browser profile.
export function toJSON({ entries, blocks, version }) {
  return JSON.stringify(
    { format: EXPORT_FORMAT, version, exportedAt: new Date().toISOString(), entries, blocks },
    null,
    2
  );
}

export function parseJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "That file doesn't look like a journal." };
  }
  if (!Array.isArray(data.entries)) {
    return { ok: false, error: "No entries found in that file." };
  }
  if (data.format && data.format !== EXPORT_FORMAT) {
    return { ok: false, error: "That file was exported by a different app." };
  }

  return {
    ok: true,
    entries: data.entries,
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    version: Number(data.version) || 0,
  };
}

function dayHeading(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

// A task keeps its checkbox so the export stays usable as a Markdown todo
// list; everything else keeps its bullet glyph.
function lineFor(entry) {
  const meta = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.note;
  const signifier = SIGNIFIERS[entry.signifier || "none"]?.char;
  const bits = [];

  if (entry.type === "task" || entry.type === "goal") bits.push(entry.done ? "- [x]" : "- [ ]");
  else bits.push("-");

  bits.push(meta.glyph);
  if (signifier) bits.push(signifier);
  bits.push(entry.text);

  const trailing = [];
  if (entry.type === "event" && entry.eventTime) trailing.push(formatTimeShort(entry.eventTime));
  if (entry.eventLocation) trailing.push(entry.eventLocation);
  if (entry.type !== "event" && entry.dueDate) trailing.push(`due ${entry.dueDate}`);
  if (entry.repeat) trailing.push(`↻ ${describeRepeat(entry.repeat).toLowerCase()}`);

  return trailing.length ? `${bits.join(" ")} — ${trailing.join(", ")}` : bits.join(" ");
}

export function toMarkdown({ entries }, { title = "Marginalia" } = {}) {
  const byDay = new Map();
  for (const entry of entries) {
    const iso = entryRelevantDate(entry);
    if (!byDay.has(iso)) byDay.set(iso, []);
    byDay.get(iso).push(entry);
  }

  const days = Array.from(byDay.keys()).sort();
  const out = [`# ${title}`, "", `Exported ${new Date().toISOString().slice(0, 10)} · ${entries.length} entries`, ""];

  let currentMonth = null;
  for (const iso of days) {
    const month = iso.slice(0, 7);
    if (month !== currentMonth) {
      currentMonth = month;
      out.push(`## ${monthLabelFromKey(month)}`, "");
    }
    out.push(`### ${dayHeading(iso)}`, "");
    for (const entry of byDay.get(iso)) out.push(lineFor(entry));
    out.push("");
  }

  return out.join("\n");
}

export function download(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking in the same tick can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
