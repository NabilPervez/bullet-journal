export function Header({
  pageTitle,
  saveError,
  readonly,
  onRetrySave,
  backupDue,
  onExport,
  onSnoozeBackup,
  theme, onToggleTheme, onOpenSettings, settingsOpen }) {
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  // Two different failures, two different messages. The old banner blamed the
  // network for what is always a local storage problem, and never cleared.
  const notice = readonly
    ? { text: "Couldn't read your saved journal. Editing is off so nothing is saved over it — export what loaded.", action: "export" }
    : saveError
      ? { text: "Couldn't save — your last change is only on screen", action: "retry" }
      : backupDue
        ? { text: "Your journal only lives on this device. Export a copy?", action: "backup" }
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
            {notice.action === "retry" && (
              <button className="btn btn-secondary" onClick={onRetrySave}>Retry</button>
            )}
            {(notice.action === "export" || notice.action === "backup") && (
              <button className="btn btn-secondary" onClick={onExport}>Export</button>
            )}
            {notice.action === "backup" && (
              <button className="btn btn-ghost" onClick={onSnoozeBackup}>Later</button>
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
