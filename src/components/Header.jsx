import { C, fontDisplay, fontMono } from "../theme";

export function Header({ pageTitle, saveError, readonly, onRetrySave }) {
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  // Two different failures, two different messages. The old banner blamed the
  // network for what is always a local storage problem, and never cleared.
  const notice = readonly
    ? { text: "Saved journal couldn't be read — showing what loaded, not saving over it", retry: false }
    : saveError
      ? { text: "Couldn't save — your last change is only on screen", retry: true }
      : null;

  return (
    <header style={{ borderBottom: `1px solid ${C.rule}`, background: `${C.paper}E6`, position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, margin: 0 }}>{pageTitle}</h1>
          <span style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint }}>{dateLabel}</span>
        </div>
        {notice && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: fontMono,
              fontSize: 11,
              color: C.critical,
              border: `1px solid ${C.critical}`,
              borderRadius: 6,
              padding: "4px 6px 4px 10px",
              maxWidth: "100%",
            }}
          >
            <span>{notice.text}</span>
            {notice.retry && (
              <button
                onClick={onRetrySave}
                style={{
                  fontFamily: fontMono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  minHeight: 32,
                  padding: "0 10px",
                  borderRadius: 5,
                  border: "none",
                  background: C.critical,
                  color: C.paper,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
