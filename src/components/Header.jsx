import { C, fontDisplay, fontMono } from "../theme";

export function Header({ pageTitle, saveError }) {
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return (
    <header style={{ borderBottom: `1px solid ${C.rule}`, background: `${C.paper}E6`, position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, margin: 0 }}>{pageTitle}</h1>
          <span style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint }}>{dateLabel}</span>
        </div>
        {saveError && (
          <span style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: C.critical, border: `1px solid ${C.critical}`, borderRadius: 4, padding: "2px 6px" }}>
            Save failed — check connection
          </span>
        )}
      </div>
    </header>
  );
}
