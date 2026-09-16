import { useMemo, useState } from "react";
import { countByType, entryRelevantDate, ENTRY_TYPES, summarizeCounts } from "../lib/model";
import { monthLabelFromKey } from "../lib/dates";
import { FutureLog } from "./FutureLogPage";

// The Index and the Future Log answer the same question from two directions —
// "where is everything?" — so they live on one page behind a switch.
export function IndexPage({ entries, addEntry, onJumpToMonth, initialTab = "index" }) {
  const [tab, setTab] = useState(initialTab === "future" ? "future" : "index");

  const grouped = useMemo(() => {
    // Group by month, then count from ENTRY_TYPES so a newly added type shows
    // up here by construction.
    const byMonth = new Map();
    entries.forEach((e) => {
      const key = entryRelevantDate(e).slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(e);
    });
    return Array.from(byMonth.entries())
      .map(([key, group]) => ({ key, counts: countByType(group), summary: summarizeCounts(countByType(group)) }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [entries]);

  return (
    <section aria-label="Index" className="stack gap-5" style={{ maxWidth: 760 }}>
      <div className="seg" role="tablist" aria-label="Index and future log">
        {[
          ["index", "Logged"],
          ["future", "Ahead"],
        ].map(([id, label]) => (
          <button key={id} role="tab" className="seg-item" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "index" ? (
        <div className="stack gap-4 page-turn">
          <div className="stack gap-1">
            <h2 className="title">Index</h2>
            <p className="meta">Every month you've logged something, with a way back in.</p>
          </div>

          {grouped.length === 0 ? (
            <p className="empty">Nothing logged yet. Start in Today.</p>
          ) : (
            <ul className="stack gap-2 stagger" style={{ listStyle: "none", margin: 0, padding: 0 }}>
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
        </div>
      ) : (
        <div className="page-turn">
          <FutureLog entries={entries} addEntry={addEntry} />
        </div>
      )}
    </section>
  );
}
