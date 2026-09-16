# Marginalia

A digital bullet journal: rapid logging, an Index, a Future Log, a Monthly Log, a Weekly Log, and a
daily time-blocking agenda. Installable as a PWA and usable offline; entries live on the device.

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` (also generates the service worker) |
| `npm run preview` | Serve the built output |
| `npm run lint` | Oxlint, including the React hooks rules |
| `npm run test` | Vitest, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run verify` | lint + test + build — what CI runs |

## Layout

```
src/
  App.jsx              state, persistence and view routing
  index.css            shell layout, responsive tiers, safe-area insets
  theme.js             colour tokens, type stacks, shared control styles
  lib/
    constants.js       agenda grid window and slot geometry
    dates.js           local-date arithmetic and formatting
    model.js           entry types, signifiers, ids, entry filing rules
    storage.js         localStorage read/write
  components/          one component per file
  hooks/
    useDragSession.js  pointer-based dragging shared by the journal and agenda
    useSwipeActions.js swipe-to-complete and swipe-to-delete on an entry row
    useViewport.js     compact / medium / expanded tier
```

`lib/` holds everything with no React in it, which is what the unit tests cover
(`src/lib/*.test.js`). Components render; they do not own persistence.

## Data model

Two lists in `localStorage`, under `marginalia:entries` and `marginalia:blocks`.

An **entry** is a journal line: `task`, `event`, `note` or `goal`, optionally carrying a signifier
(priority, inspiration), a due date, or an event date, time and location. A **block** is a placement
of an entry on the agenda: a date, a start offset in minutes from the top of the grid window, and a
duration. Scheduling an entry creates a block and records its id on the entry.

The agenda window is 06:00–22:00 in 30-minute slots (`lib/constants.js`).

## Conventions

- Dates are handled as local `YYYY-MM-DD` strings. Never round-trip a journal date through UTC.
- Any focusable input stays at 16px or larger; below that, iOS Safari zooms the page on focus.
- Touch targets are at least 44pt on coarse pointers. Nothing daily may be hover-only.
- `env(safe-area-inset-bottom)` is respected by the bottom nav; do not give it a flat height.
- Dragging uses Pointer Events, never the HTML5 drag-and-drop API, which mobile browsers do not
  fire. A drag handle carries `touch-action: none`; the row around it still scrolls.
- Anything you can do by dragging must also be doable by keyboard — the schedule picker is the
  keyboard and touch route onto the calendar.
- Three responsive tiers (`useViewport`): compact under 600, medium to 899, expanded above. No
  fixed pixel widths on inputs — the layout has to hold at 320pt.
- Font sizes come from `--fs-body` / `--fs-meta` / `--fs-label`, sized for the phone first and
  stepped down on wide screens. Don't hardcode a size for text people read daily.

## Status

Sprints 0–3 of a six-sprint plan have landed: repo cleanup, module split, tests and CI; a single
reducer with one writer, a schema migration and undo; pointer-based scheduling with a keyboard
route, an inline slot composer and JSON/Markdown export with JSON import; and a one-handed phone
layout — thumb-arc capture sheet, swipe actions, Log/Schedule tabs, 44pt agenda rows and a day
pager.

Still open: self-hosted fonts (an offline launch falls back to Georgia), edge auto-scroll while
dragging, the migration ritual and collections (Sprint 4), and recurrence, overlapping-block lanes
and dark mode (Sprint 5).
