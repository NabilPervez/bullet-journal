// Design tokens live in index.css. These are the same tokens addressed from
// JS, so a component that still sets an inline style stays on the system and
// follows the theme.

export const C = {
  paper: "var(--bg)",
  surface: "var(--surface)",
  paperDim: "var(--surface-2)",
  raised: "var(--surface-3)",
  ink: "var(--text)",
  inkSoft: "var(--text-muted)",
  inkFaint: "var(--text-dim)",
  rule: "var(--line)",
  ruleStrong: "var(--line-strong)",
  accent: "var(--accent)",
  onAccent: "var(--on-accent)",
  critical: "var(--danger)",
};

export const TYPE_COLOR = {
  goal: "var(--type-goal)",
  task: "var(--type-task)",
  event: "var(--type-event)",
  note: "var(--type-note)",
};

export const fontDisplay = "var(--font-display)";
export const fontBody = "var(--font-ui)";
export const fontMono = "var(--font-mono)";

export const THEMES = ["night", "day"];
export const THEME_KEY = "marginalia:theme";
