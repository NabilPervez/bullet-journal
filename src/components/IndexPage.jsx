import { useMemo } from "react";
import { entryRelevantDate } from "../lib/model";
import { monthLabelFromKey } from "../lib/dates";
import { C, fontBody, fontDisplay, fontMono } from "../theme";

export function IndexPage({ entries, onJumpToMonth }) {
  const grouped = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const key = entryRelevantDate(e).slice(0, 7);
      if (!map.has(key)) map.set(key, { key, tasks: 0, events: 0, notes: 0, total: 0 });
      const g = map.get(key);
      g[e.type + "s"] = (g[e.type + "s"] || 0) + 1;
      g.total += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
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
                <p style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, margin: "2px 0 0" }}>
                  {g.tasks || 0} tasks · {g.events || 0} events · {g.notes || 0} notes
                </p>
              </div>
              <button
                onClick={() => onJumpToMonth(g.key)}
                style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer", flexShrink: 0 }}
              >
                View →
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
