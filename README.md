# Digital Bullet Journal

A bullet journal that lives on your phone. Write things down as one short line each, tick them off,
and give the ones that need a time a place on a schedule. It installs as an app, works offline, and
keeps everything on your own device.

---

## What it is

The bullet journal method is a way of keeping one notebook for everything: tasks, events, notes and
goals, each written as a single line with a glyph in front of it. The glyph is the point — it says
at a glance what kind of thing you're looking at, and it decides where that line shows up later.

This app is that method, plus the parts a notebook can't do: an entry you can drag onto a time
block, a schedule that moves with you, and a journal you can export and carry.

**Four kinds of entry**

| Glyph | Kind | What it's for |
| --- | --- | --- |
| ✦ | **Goal** | Something you're aiming at. Can have a due date. |
| • | **Task** | Something to do. Can have a due date. |
| ○ | **Event** | Something happening at a time. Needs a date; time and place optional. |
| – | **Note** | Something worth remembering. No date of its own. |

**Two marks**

| Mark | Meaning |
| --- | --- |
| ★ | Priority — worth doing first |
| ! | Inspiration — an idea worth keeping |

Each kind owns a colour, and it is the same colour everywhere: the stripe on the entry, the chip in
the composer, the block on the schedule.

---

## How it works

Your journal is two lists kept in this browser: **entries** (the lines you write) and **blocks**
(placements of an entry on a day's schedule). Nothing is sent anywhere and there is no account.

An entry is filed under a date: an event under its event date, a task or goal under its due date,
and anything undated under the day you wrote it. That one rule is what puts the same entry in the
right place in every view.

Scheduling an entry creates a block — a date, a start time and a length — and links the two. Move or
resize the block and an event's own time follows it. Take it off the calendar and the entry stays in
your log, just unscheduled.

Everything saves itself as you go. If a save fails you'll see it in the header with a Retry; if the
stored journal can't be read, the app shows what it could load and refuses to save over the rest
rather than quietly replacing it.

---

## The screens

### Today
Your day, in two halves.

- **Log** — the rapid log: everything you've written, newest first, goals at the top. Tick a
  checkbox to complete something and it greys out and gets struck through.
- **Schedule** — the day in half-hour rows from 6am to 10pm. On a phone it opens on the busy part of
  the day, with the quiet ends one tap away.

### Month
Every day of the month down the left as a date stamp, with what's filed on it. Beside it, the brain
dump: the month's open tasks and goals, and a box to throw new ones into.

### Week
Five days side by side — swipe between them on a phone. Each day can be added to in place.

### Index
Where things are.

- **Logged** — one row per month you've written in, with a breakdown and a way straight to it.
- **Ahead** — the next twelve months. Add something with a date and it lands in the right month.

### Settings
Behind the ⚙ in the header: theme, your journal's data (export and import), a reminder of the
notation, and a way to replay the walkthrough.

---

## How to use it

**Capture.** On a phone, tap the **+** button — it sits where your thumb already is. Pick a kind,
write one line, log it. Dates and marks live behind *Add date or mark*, so the common case stays two
taps. On a desktop the same composer sits at the top of the log.

**Complete.** Tick the checkbox; untick it if you were wrong. On a phone you can also swipe a row
right to complete and left to delete — a deletion always offers an undo for five seconds.

**Schedule.** Three ways, so you can use whichever suits:

- Drag the ⠿ handle of an entry onto a time slot (desktop).
- Tap ⊕ on an entry and pick a time from the list (anywhere, including by keyboard).
- Tap an empty slot on the schedule and write straight into it.

Once it's there: drag the block to move it, drag its bottom edge to change the length (it snaps to
15 minutes), or focus it and use the arrow keys — Delete takes it off the calendar.

**Review.** At the end of a month, open the Index. *Logged* shows what the month contained; *Ahead*
shows what's still coming. Anything still open is a decision: do it, schedule it, or let it go.

**Keep a copy.** Settings → Export JSON gives you the whole journal, and Import brings it back.
Export Markdown gives you a readable file with tasks as checkboxes. Clearing your browser's site
data clears the journal, so take a copy occasionally.

**Keyboard.** Enter logs an entry and saves an edit; Escape closes a sheet or cancels an edit; every
control is reachable by Tab, and scheduling has a full keyboard path through the ⊕ picker.

---

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/`, including the service worker |
| `npm run preview` | Serve the built output |
| `npm run lint` | Oxlint, including the React hooks rules |
| `npm run test` | Vitest, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run verify` | lint + test + build — what CI runs |

## Layout

```
src/
  App.jsx              state, persistence and view routing
  index.css            the design system: tokens, components, responsive tiers
  theme.js             the same tokens addressed from JS
  lib/
    constants.js       agenda grid window and slot geometry
    dates.js           local-date arithmetic and formatting
    model.js           entry types, signifiers, ids, entry filing rules
    agenda.js          which part of the day to show
    gestures.js        swipe thresholds
    journalReducer.js  every change to the journal, in one place
    migrations.js      schema version and upgrades
    storage.js         localStorage read/write
    transfer.js        export and import
  hooks/               drag, swipe, viewport tier, theme, onboarding
  components/          one component per file
```

`lib/` holds everything with no React in it, and that is what the unit tests cover
(`src/lib/*.test.js`). Components render; they do not own persistence.

## Design system

Night is the default theme; Settings switches to Day and remembers it. Colour, spacing
(`--s1`…`--s6`), radii and the type scale are tokens in `index.css`, and components use classes
(`.btn`, `.icon-btn`, `.chip`, `.sticker`, `.ticket`, `.card`, `.sheet`) rather than inline style
objects.

`--accent` is a fill that carries black text. For accent-coloured *text*, use `--accent-ink`, which
is darkened in the Day theme where the fill colour would be unreadable as type.

## Conventions

- Dates are local `YYYY-MM-DD` strings. Never round-trip a journal date through UTC.
- Any focusable input stays at 16px or larger; below that, iOS Safari zooms the page on focus.
- 46px is the minimum for anything a finger meets (44 for the small variants on touch). An icon is a
  circle with a surface, never a bare glyph.
- `env(safe-area-inset-bottom)` is respected by the bottom nav; don't give it a flat height.
- Dragging uses Pointer Events, never the HTML5 drag-and-drop API, which mobile browsers don't fire.
- Anything you can do by dragging must also be doable by keyboard.
- Motion is short and purposeful, and all of it is disabled under `prefers-reduced-motion`.

## Status

Landed: repo cleanup, a module split, tests and CI; one reducer with a single writer, schema
migrations and undo; pointer-based scheduling with a keyboard route and export/import; a one-handed
phone layout; a dark-first design system; and a first-run walkthrough.

Still open: self-hosted fonts (an offline launch falls back to a system face), edge auto-scroll while
dragging, a true Monday–Sunday week, the monthly migration ritual with `>` and `<`, collections,
recurring entries and overlapping-block lanes.
