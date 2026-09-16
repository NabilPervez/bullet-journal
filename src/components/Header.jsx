export function Header({ pageTitle, saveError, readonly, onRetrySave, theme, onToggleTheme, onOpenSettings, settingsOpen }) {
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  // Two different failures, two different messages. The old banner blamed the
  // network for what is always a local storage problem, and never cleared.
  const notice = readonly
    ? { text: "Couldn't read your saved journal — showing what loaded, not saving over it", retry: false }
    : saveError
      ? { text: "Couldn't save — your last change is only on screen", retry: true }
      : null;

  return (
    <header className="app-header">
      <div className="stack" style={{ minWidth: 0 }}>
        <h1 className="title-lg">{pageTitle}</h1>
        <p className="eyebrow">{dateLabel}</p>
      </div>

      <div className="row gap-2">
        {notice && (
          <div role="alert" className="notice">
            <span>{notice.text}</span>
            {notice.retry && (
              <button className="btn btn-secondary" onClick={onRetrySave}>Retry</button>
            )}
          </div>
        )}
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          aria-label="Settings"
          aria-current={settingsOpen ? "page" : undefined}
          title="Settings"
          style={settingsOpen ? { background: "var(--accent)", color: "var(--on-accent)" } : undefined}
        >
          ⚙
        </button>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === "night" ? "Switch to day theme" : "Switch to night theme"}
          title={theme === "night" ? "Day" : "Night"}
        >
          {theme === "night" ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
