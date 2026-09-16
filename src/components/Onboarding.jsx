import { useState } from "react";
import { ENTRY_TYPES } from "../lib/model";

// A first run explains the method, not the buttons. Someone who has never
// kept a bullet journal doesn't need a tour of the nav bar — they need to
// know what the four glyphs mean and what they're supposed to do each day.
const STEPS = [
  {
    eyebrow: "What this is",
    title: "A journal that keeps score",
    body: "Write things down as one short line each. Every line is one of four kinds, and the kind decides where it shows up later.",
    art: "types",
  },
  {
    eyebrow: "Capture",
    title: "One line, five seconds",
    body: "Tap the + button, pick a kind, and write. Nothing needs a date — add one only when the thing actually has one.",
    art: "capture",
  },
  {
    eyebrow: "Plan the day",
    title: "Give the work a time",
    body: "On Today, the Schedule tab is your day in half-hours. Put an entry on it and it becomes a block you can move, stretch or take off again.",
    art: "schedule",
  },
  {
    eyebrow: "Look back",
    title: "Tick, and move on",
    body: "Check things off as you go. At the end of a month, the Index shows what you logged and Ahead holds what's still coming.",
    art: "review",
  },
];

export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="onboard-stage">
        <div className="stack gap-2">
          <p className="eyebrow">{current.eyebrow}</p>
          <h1 className="title-lg">{current.title}</h1>
          <p className="muted" style={{ margin: 0, maxWidth: "42ch" }}>{current.body}</p>
        </div>

        <div className="onboard-art" key={current.art}>
          <Art kind={current.art} />
        </div>

        <div className="onboard-dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.art} className="onboard-dot" data-active={i === step ? "true" : "false"} />
          ))}
        </div>
      </div>

      <div className="onboard-actions">
        {isLast ? (
          <button className="btn btn-primary btn-block" onClick={onDone}>Start writing</button>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={onDone}>Skip</button>
            <button className="btn btn-primary grow" onClick={() => setStep((n) => n + 1)}>Next</button>
          </>
        )}
      </div>
    </div>
  );
}

// The illustrations are the app's own components, not pictures of them, so
// what you learn here is literally what you'll tap in a moment.
function Art({ kind }) {
  if (kind === "types") {
    return (
      <div className="stack gap-3 stagger">
        {Object.entries(ENTRY_TYPES).map(([key, meta]) => (
          <div key={key} className="row gap-3">
            <span className="sticker sticker-static" data-type={key} aria-hidden="true">{meta.glyph}</span>
            <span className="grow">
              <strong>{meta.label}</strong>
              <span className="meta"> — {BLURB[key]}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "capture") {
    return (
      <div className="stack gap-3">
        <div className="chip-grid" aria-hidden="true">
          {Object.entries(ENTRY_TYPES).map(([key, meta], i) => (
            <span key={key} className="chip" data-type={key} aria-pressed={i === 1}>
              <span className="chip-glyph">{meta.glyph}</span>
              {meta.label}
            </span>
          ))}
        </div>
        <div className="input input-lg row" aria-hidden="true" style={{ alignItems: "center", color: "var(--text-dim)" }}>
          Call the dentist
        </div>
        <span className="btn btn-primary btn-block" aria-hidden="true">Log it</span>
      </div>
    );
  }

  if (kind === "schedule") {
    return (
      <div className="stack gap-2" aria-hidden="true">
        {[
          ["9:00 AM", "Design review", "event"],
          ["10:30 AM", null, null],
          ["11:00 AM", "Write the brief", "task"],
        ].map(([time, label, type]) => (
          <div key={time} className="row gap-3">
            <span className="meta" style={{ width: 72, flex: "0 0 auto" }}>{time}</span>
            {label ? (
              <span
                className="grow"
                style={{
                  background: `var(--type-${type})`,
                  color: "#0B0B0F",
                  borderRadius: "var(--r-sm)",
                  padding: "var(--s2) var(--s3)",
                  fontWeight: 700,
                  fontSize: "var(--fs-meta)",
                }}
              >
                {label}
              </span>
            ) : (
              <span className="grow" style={{ borderTop: "1px dashed var(--line-strong)", marginTop: 10 }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="stack gap-3" aria-hidden="true">
      <div className="row gap-3">
        <span className="check-btn" aria-checked="true" role="checkbox">
          <span className="check-box" style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "var(--on-accent)" }}>✓</span>
        </span>
        <span className="entry-text" data-done="true" style={{ color: "var(--text-dim)" }}>Call the dentist</span>
        <span className="stamp">Done</span>
      </div>
      <div className="row gap-3">
        <span className="check-btn" role="checkbox" aria-checked="false">
          <span className="check-box">✓</span>
        </span>
        <span className="entry-text">Book the flights</span>
      </div>
    </div>
  );
}

const BLURB = {
  goal: "something you're aiming at",
  task: "something to do",
  event: "something happening at a time",
  note: "something worth remembering",
};
