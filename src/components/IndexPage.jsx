import { useMemo } from "react";
import { countByType, entryRelevantDate, summarizeCounts } from "../lib/model";
import { JournalData } from "./JournalData";
import { monthLabelFromKey } from "../lib/dates";
import { C, fontBody, fontDisplay, fontMono } from "../theme";

export function IndexPage({ entries, blocks, version, onJumpToMonth, onImport }) {
  const grouped = useMemo(() => {
    // Group by month, then count from ENTRY_TYPES so a newly added type shows
    // up here by construction — goal was being counted into a bucket the
    // summary line never printed.
    const byMonth = new Map();
    entries.forEach((e) => {
      const key = entryRelevantDate(e).slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(e);
    });
    return Array.from(byMonth.entries())
      .map(([key, group]) => ({ key, total: group.length, summary: summarizeCounts(countByType(group)) }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [entries]);

  return (
    <section aria-label="Index" style={{ maxWidth: 640 }}>
      <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: "0 0 4px" }}>Index</h2>
      <p style={{ fontFamily: fontMono, fontSize: 11, color: C.inkFaint, margin: "0 0 20px" }}>
        Every month you've logged something, with a way back in.
      </p>

      {grouped.length === 0 ? (
        <p style={{ fontFamily: fontBody, fontSize: 13, color: C.inkFaint, fontStyle: "italic", padding: "24px 0", textAlign: "center", border: `1px dashed ${C.rule}`, borderRadius: 8 }}>
          Nothing logged yet. Start in the Daily Log.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {grouped.map((g) => (
            <li
              key={g.key}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: `1px solid ${C.rule}`, borderRadius: 8, background: "rgba(255,255,255,0.4)" }}
            >
              <div>
                <p style={{ fontFamily: fontBody, fontSize: 15, margin: 0, color: C.ink }}>{monthLabelFromKey(g.key)}</p>
                <p style={{ fontFamily: fontMono, fontSize: 12, color: C.inkFaint, margin: "2px 0 0" }}>
                  {g.summary}
                </p>
              </div>
              <button
                onClick={() => onJumpToMonth(g.key)}
                style={{ fontFamily: fontMono, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", minHeight: 44, padding: "0 16px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer", flexShrink: 0 }}
              >
                View →
              </button>
            </li>
          ))}
        </ul>
      )}

      <JournalData entries={entries} blocks={blocks} version={version} onImport={onImport} />
    </section>
  );
}
