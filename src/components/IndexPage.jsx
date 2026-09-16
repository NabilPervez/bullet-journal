import { useMemo } from "react";
import { countByType, entryRelevantDate, ENTRY_TYPES, summarizeCounts } from "../lib/model";
import { monthLabelFromKey } from "../lib/dates";
import { JournalData } from "./JournalData";

export function IndexPage({ entries, blocks, version, onJumpToMonth, onImport }) {
  const grouped = useMemo(() => {
    // Group by month, then count from ENTRY_TYPES so a newly added type shows
    // up here by construction — goal used to be counted into a bucket the
    // summary line never printed.
    const byMonth = new Map();
    entries.forEach((e) => {
      const key = entryRelevantDate(e).slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(e);
    });
    return Array.from(byMonth.entries())
      .map(([key, group]) => ({ key, group, counts: countByType(group), summary: summarizeCounts(countByType(group)) }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [entries]);

  return (
    <section aria-label="Index" className="stack gap-5" style={{ maxWidth: 680 }}>
      <div className="stack gap-1">
        <h2 className="title">Index</h2>
        <p className="meta">Every month you've logged something, with a way back in.</p>
      </div>

      {grouped.length === 0 ? (
        <p className="empty">Nothing logged yet. Start in Today.</p>
      ) : (
        <ul className="stack gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {grouped.map((g) => (
            <li key={g.key}>
              <button className="index-row" onClick={() => onJumpToMonth(g.key)}>
                <span className="stack gap-1" style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-title)" }}>
                    {monthLabelFromKey(g.key)}
                  </span>
                  <span className="meta">{g.summary}</span>
                </span>
                <span className="row gap-1" aria-hidden="true">
                  {Object.keys(ENTRY_TYPES)
                    .filter((t) => g.counts[t])
                    .map((t) => (
                      <span key={t} className="sticker sticker-sm sticker-static" data-type={t}>
                        {ENTRY_TYPES[t].glyph}
                      </span>
                    ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <JournalData entries={entries} blocks={blocks} version={version} onImport={onImport} />
    </section>
  );
}
