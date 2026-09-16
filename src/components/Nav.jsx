import { C, fontDisplay, fontMono } from "../theme";

const NAV_ITEMS = [
  { id: "index", label: "Index", glyph: "≡" },
  { id: "future", label: "Future Log", glyph: "→" },
  { id: "monthly", label: "Monthly Log", glyph: "▦" },
  { id: "weekly", label: "Weekly Log", glyph: "▤" },
  { id: "daily", label: "Daily Log", glyph: "•" },
];

export function Nav({ view, onChangeView }) {
  return (
    <nav aria-label="Collections" className="marginalia-nav">
      <div className="marginalia-nav-brand" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, padding: "10px 20px 14px" }}>
        Marginalia
      </div>
      {NAV_ITEMS.map(({ id, label, glyph }) => {
        const active = view === id;
        return (
          <button
            key={id}
            onClick={() => onChangeView(id)}
            aria-current={active ? "page" : undefined}
            className="marginalia-nav-item"
            style={{ background: "none", border: "none", cursor: "pointer", color: active ? C.accent : C.inkSoft }}
          >
            <span aria-hidden="true" style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: active ? 700 : 400, lineHeight: 1 }}>{glyph}</span>
            <span style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
