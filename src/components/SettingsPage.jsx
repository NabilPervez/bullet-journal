import { JournalData } from "./JournalData";
import { ENTRY_TYPES, SIGNIFIERS } from "../lib/model";

export function SettingsPage({ entries, blocks, version, onImport, onExported, theme, onSetTheme, onReplayTour }) {
  return (
    <section aria-label="Settings" className="stack gap-5 page-turn" style={{ maxWidth: 680 }}>
      <div className="stack gap-1">
        <h2 className="title">Settings</h2>
        <p className="meta">How the journal looks, and where your writing lives.</p>
      </div>

      <div className="panel stack gap-2">
        <h3 style={{ fontSize: "var(--fs-title)" }}>Appearance</h3>
        <div className="setting-row">
          <div className="stack gap-1">
            <span style={{ fontWeight: 600 }}>Theme</span>
            <span className="meta">Night is the default. Your choice is kept on this device.</span>
          </div>
        </div>
        <div className="seg" role="tablist" aria-label="Theme">
          {[
            ["night", "Night"],
            ["day", "Day"],
          ].map(([id, label]) => (
            <button key={id} role="tab" className="seg-item" aria-selected={theme === id} onClick={() => onSetTheme(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Moved here from the Index, where it sat under the months and had
          nothing to do with finding an entry. */}
      <JournalData entries={entries} blocks={blocks} version={version} onImport={onImport} onExported={onExported} />

      <div className="panel stack gap-3">
        <h3 style={{ fontSize: "var(--fs-title)" }}>The notation</h3>
        <p className="meta">Four kinds of entry, two marks. Every list in the app uses them.</p>

        <ul className="stack gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {Object.entries(ENTRY_TYPES).map(([key, meta]) => (
            <li key={key} className="row gap-3">
              <span className="sticker sticker-static" data-type={key} aria-hidden="true">{meta.glyph}</span>
              <span className="grow">
                <strong>{meta.label}</strong>
                <span className="meta"> — {TYPE_BLURB[key]}</span>
              </span>
            </li>
          ))}
          {Object.entries(SIGNIFIERS)
            .filter(([key]) => key !== "none")
            .map(([key, meta]) => (
              <li key={key} className="row gap-3">
                <span className="check-btn" aria-hidden="true">
                  <span style={{ color: "var(--flare)", fontWeight: 800, fontSize: 18 }}>{meta.char}</span>
                </span>
                <span className="grow">
                  <strong>{meta.label}</strong>
                  <span className="meta"> — {key === "priority" ? "worth doing first" : "an idea worth keeping"}</span>
                </span>
              </li>
            ))}
        </ul>

        <button className="btn btn-ghost btn-block" onClick={onReplayTour}>Show the walkthrough again</button>
      </div>

      <div className="panel stack gap-3">
        <h3 style={{ fontSize: "var(--fs-title)" }}>Privacy</h3>
        <p className="meta">
          Your journal is stored only on this device. Nothing you write is sent anywhere. Clearing the app's
          storage, or uninstalling it, clears the journal — export a copy first.
        </p>
        {/* A plain same-origin link: in the Android app it opens inside the app
            window, and the service worker is told to leave /privacy alone. */}
        <a className="btn btn-ghost btn-block" href="/privacy">Read the privacy policy</a>
      </div>

      <p className="meta">Digital Bullet Journal · Nabil Pervez Consulting</p>
    </section>
  );
}

const TYPE_BLURB = {
  goal: "something you're aiming at",
  task: "something to do",
  event: "something happening at a time",
  note: "something worth remembering",
};
