import { useState, useEffect, useRef, useMemo } from "react";

// ---------- Persistence (artifact-native window.storage) ----------
const STORAGE_PREFIX = "marginalia:";

async function loadList(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`localStorage read('${key}') failed`, err);
    return [];
  }
}

async function saveList(key, list) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error(`localStorage write('${key}') failed`, err);
    return false;
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const ENTRY_TYPES = {
  goal: { glyph: "✦", label: "Goal" },
  task: { glyph: "•", label: "Task" },
  event: { glyph: "○", label: "Event" },
  note: { glyph: "–", label: "Note" },
};

const SIGNIFIERS = {
  none: { char: "", label: "None" },
  priority: { char: "★", label: "Priority" },
  inspiration: { char: "!", label: "Inspiration" },
};

// ---------- Design tokens ----------
const C = {
  paper: "#FAFAF7",
  paperDim: "#F1F0EB",
  ink: "#1B1B18",
  inkSoft: "#4A4944",
  inkFaint: "#8C8A82",
  rule: "#DAD8CF",
  accent: "#26365C",
  critical: "#9C3B2E",
};

const fontDisplay = "'Space Grotesk', sans-serif";
const fontBody = "'Source Serif 4', Georgia, serif";
const fontMono = "'IBM Plex Mono', monospace";

const navBtnStyle = {
  fontFamily: fontMono,
  fontSize: 13,
  width: 26,
  height: 26,
  borderRadius: 6,
  border: `1px solid ${C.rule}`,
  background: C.paperDim,
  color: C.inkSoft,
  cursor: "pointer",
};

const fieldLabelStyle = {
  display: "block",
  fontFamily: fontMono,
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: C.inkFaint,
  marginBottom: 3,
};

const fieldInputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.6)",
  border: `1px solid ${C.rule}`,
  borderRadius: 6,
  padding: "6px 8px",
  fontFamily: fontBody,
  fontSize: 13,
  color: C.ink,
  outline: "none",
  boxSizing: "border-box",
};

const START_HOUR = 6;
const END_HOUR = 22;
const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const ROW_HEIGHT = 26;
const DEFAULT_EVENT_DURATION = SLOT_MINUTES;

// ---------- Date helpers ----------
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hhmmToStartMinute(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const totalFromMidnight = h * 60 + m;
  const maxStart = SLOTS_PER_DAY * SLOT_MINUTES - SLOT_MINUTES;
  let startMinute = totalFromMidnight - START_HOUR * 60;
  if (startMinute < 0) startMinute = 0;
  if (startMinute > maxStart) startMinute = maxStart;
  return startMinute;
}

function startMinuteToHHMM(startMinute) {
  const totalFromMidnight = START_HOUR * 60 + startMinute;
  const h = Math.floor(totalFromMidnight / 60);
  const m = totalFromMidnight % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutesToLabel(startMinute) {
  const total = START_HOUR * 60 + startMinute;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDateShort(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTimeShort(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function getMonthInfo(monthOffset) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return {
    year: d.getFullYear(),
    monthIndex: d.getMonth(),
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

function monthLabelFromKey(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function monthOffsetFromKey(key) {
  const [y, m] = key.split("-").map(Number);
  const now = new Date();
  return y * 12 + (m - 1) - (now.getFullYear() * 12 + now.getMonth());
}

function daysInMonthCount(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isoFor(year, monthIndex, day) {
  return toISODate(new Date(year, monthIndex, day));
}

// The date a given entry is "filed under" for Index / Future / Monthly views
function entryRelevantDate(entry) {
  if (entry.type === "event" && entry.eventDate) return entry.eventDate;
  if ((entry.type === "task" || entry.type === "goal") && entry.dueDate) return entry.dueDate;
  return toISODate(new Date(entry.createdAt));
}

// ================= App =================
export default function App() {
  const [entries, setEntries] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("view");
    return ["index", "future", "monthly", "weekly", "daily"].includes(param) ? param : "daily";
  }); // 'index' | 'future' | 'monthly' | 'weekly' | 'daily'
  const [monthOffset, setMonthOffset] = useState(0);
  const [dragEntryId, setDragEntryId] = useState(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    (async () => {
      const [e, b] = await Promise.all([loadList("entries"), loadList("blocks")]);
      setEntries(e.sort((a, c) => c.createdAt - a.createdAt));
      setBlocks(b);
      setLoaded(true);
    })();
  }, []);

  async function addEntry(text, type, meta = {}) {
    const id = uid();
    let block = null;
    if (type === "event" && meta.eventDate && meta.eventTime) {
      const startMinute = hhmmToStartMinute(meta.eventTime);
      if (startMinute !== null) {
        block = { id: uid(), entryId: id, date: meta.eventDate, startMinute, durationMinutes: DEFAULT_EVENT_DURATION };
      }
    }
    const entry = {
      id,
      text,
      type,
      createdAt: Date.now(),
      done: false,
      scheduledBlockId: block ? block.id : null,
      signifier: meta.signifier || null,
      dueDate: meta.dueDate || null,
      eventDate: meta.eventDate || null,
      eventTime: meta.eventTime || null,
      eventLocation: meta.eventLocation || null,
    };
    const nextEntries = [entry, ...entries];
    setEntries(nextEntries);
    const ok1 = await saveList("entries", nextEntries);
    if (!ok1) setSaveError(true);
    if (block) {
      const nextBlocks = [...blocks, block];
      setBlocks(nextBlocks);
      const ok2 = await saveList("blocks", nextBlocks);
      if (!ok2) setSaveError(true);
    }
    return entry;
  }

  async function updateEntry(entry, patch) {
    const merged = { ...entry, ...patch };
    let nextBlocks = blocks;
    let blocksChanged = false;

    if (merged.type === "event" && merged.eventDate && merged.eventTime) {
      const startMinute = hhmmToStartMinute(merged.eventTime);
      if (startMinute !== null) {
        if (merged.scheduledBlockId) {
          nextBlocks = blocks.map((b) => (b.id === merged.scheduledBlockId ? { ...b, date: merged.eventDate, startMinute } : b));
        } else {
          const block = { id: uid(), entryId: entry.id, date: merged.eventDate, startMinute, durationMinutes: DEFAULT_EVENT_DURATION };
          nextBlocks = [...blocks, block];
          merged.scheduledBlockId = block.id;
        }
        blocksChanged = true;
      }
    }

    const nextEntries = entries.map((e) => (e.id === entry.id ? merged : e));
    setEntries(nextEntries);
    const ok1 = await saveList("entries", nextEntries);
    if (!ok1) setSaveError(true);
    if (blocksChanged) {
      setBlocks(nextBlocks);
      const ok2 = await saveList("blocks", nextBlocks);
      if (!ok2) setSaveError(true);
    }
  }

  async function toggleEntryDone(entry) {
    await updateEntry(entry, { done: !entry.done });
  }

  async function deleteEntry(entry) {
    if (entry.scheduledBlockId) {
      const nextBlocks = blocks.filter((b) => b.id !== entry.scheduledBlockId);
      setBlocks(nextBlocks);
      await saveList("blocks", nextBlocks);
    }
    const nextEntries = entries.filter((e) => e.id !== entry.id);
    setEntries(nextEntries);
    await saveList("entries", nextEntries);
  }

  async function scheduleEntry(entry, date, startMinute, durationMinutes = SLOT_MINUTES) {
    const block = { id: uid(), entryId: entry.id, date, startMinute, durationMinutes };
    const nextBlocks = [...blocks, block];
    setBlocks(nextBlocks);
    await saveList("blocks", nextBlocks);
    const hhmm = startMinuteToHHMM(startMinute);
    const nextEntries = entries.map((e) =>
      e.id === entry.id
        ? { ...e, scheduledBlockId: block.id, ...(e.type === "event" ? { eventDate: date, eventTime: hhmm } : {}) }
        : e
    );
    setEntries(nextEntries);
    await saveList("entries", nextEntries);
  }

  async function moveBlock(block, date, startMinute) {
    const next = blocks.map((b) => (b.id === block.id ? { ...b, date, startMinute } : b));
    setBlocks(next);
    await saveList("blocks", next);
    const owner = entries.find((e) => e.id === block.entryId);
    if (owner && owner.type === "event") {
      const hhmm = startMinuteToHHMM(startMinute);
      const nextEntries = entries.map((e) => (e.id === owner.id ? { ...e, eventDate: date, eventTime: hhmm } : e));
      setEntries(nextEntries);
      await saveList("entries", nextEntries);
    }
  }

  async function unscheduleBlock(block) {
    const nextBlocks = blocks.filter((b) => b.id !== block.id);
    setBlocks(nextBlocks);
    await saveList("blocks", nextBlocks);
    const nextEntries = entries.map((e) => (e.id === block.entryId ? { ...e, scheduledBlockId: null } : e));
    setEntries(nextEntries);
    await saveList("entries", nextEntries);
  }

  async function resizeBlock(block, durationMinutes) {
    const next = blocks.map((b) => (b.id === block.id ? { ...b, durationMinutes } : b));
    setBlocks(next);
    await saveList("blocks", next);
  }

  function jumpToMonth(key) {
    setMonthOffset(monthOffsetFromKey(key));
    setView("monthly");
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontMono, color: C.inkFaint, fontSize: 12 }}>
        Loading journal…
      </div>
    );
  }

  const pageTitles = { index: "Index", future: "Future Log", monthly: "Monthly Log", weekly: "Weekly Log", daily: "Daily Log" };

  return (
    <div className="app-shell" style={{ background: C.paper, color: C.ink, fontFamily: fontBody }}>
      <Nav view={view} onChangeView={setView} />
      <div className="app-main">
        <Header pageTitle={pageTitles[view]} saveError={saveError} />
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 32px" }}>
          {view === "index" && <IndexPage entries={entries} onJumpToMonth={jumpToMonth} />}
          {view === "future" && <FutureLogPage entries={entries} addEntry={addEntry} />}
          {view === "monthly" && (
            <MonthlyLogPage
              entries={entries}
              addEntry={addEntry}
              toggleEntryDone={toggleEntryDone}
              deleteEntry={deleteEntry}
              monthOffset={monthOffset}
              setMonthOffset={setMonthOffset}
            />
          )}
          {view === "weekly" && (
            <WeeklyLogPage
              entries={entries}
              addEntry={addEntry}
              toggleEntryDone={toggleEntryDone}
              deleteEntry={deleteEntry}
              updateEntry={updateEntry}
              scheduleEntry={scheduleEntry}
              dragEntryId={dragEntryId}
              setDragEntryId={setDragEntryId}
            />
          )}
          {view === "daily" && (
            <DailyLogPage
              entries={entries}
              blocks={blocks}
              addEntry={addEntry}
              toggleEntryDone={toggleEntryDone}
              deleteEntry={deleteEntry}
              updateEntry={updateEntry}
              scheduleEntry={scheduleEntry}
              unscheduleBlock={unscheduleBlock}
              resizeBlock={resizeBlock}
              moveBlock={moveBlock}
              dragEntryId={dragEntryId}
              setDragEntryId={setDragEntryId}
            />
          )}
        </main>
      </div>
      <style>{`
        .app-shell { display: flex; flex-direction: column; min-height: 100vh; }
        .app-main { flex: 1; min-width: 0; padding-bottom: 76px; }
        .marginalia-nav { position: fixed; bottom: 0; left: 0; right: 0; height: 64px; display: flex; flex-direction: row;
          z-index: 30; background: ${C.paperDim}; border-top: 1px solid ${C.rule}; }
        .marginalia-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 6px 0; }
        .marginalia-nav-brand { display: none; }
        .marginalia-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
        .marginalia-monthly { display: grid; grid-template-columns: 1fr; gap: 32px; }
        .marginalia-future-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }

        @media (min-width: 900px) {
          .app-shell { flex-direction: row; }
          .marginalia-nav { position: sticky; top: 0; bottom: auto; left: 0; width: 208px; height: 100vh; flex-direction: column;
            justify-content: flex-start; align-items: stretch; padding-top: 8px; gap: 2px; border-right: 1px solid ${C.rule}; border-top: none; flex-shrink: 0; }
          .marginalia-nav-item { flex: none; flex-direction: row; justify-content: flex-start; padding: 10px 20px; gap: 12px; }
          .marginalia-nav-brand { display: block; }
          .app-main { padding-bottom: 0; }
          .marginalia-grid { grid-template-columns: minmax(300px, 380px) 1fr; }
          .marginalia-monthly { grid-template-columns: 1.3fr 1fr; }
          .marginalia-future-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        }
      `}</style>
    </div>
  );
}

// ================= Nav =================
const NAV_ITEMS = [
  { id: "index", label: "Index", glyph: "≡" },
  { id: "future", label: "Future Log", glyph: "→" },
  { id: "monthly", label: "Monthly Log", glyph: "▦" },
  { id: "weekly", label: "Weekly Log", glyph: "▤" },
  { id: "daily", label: "Daily Log", glyph: "•" },
];

function Nav({ view, onChangeView }) {
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

function Header({ pageTitle, saveError }) {
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

// ================= Index =================
function IndexPage({ entries, onJumpToMonth }) {
  const grouped = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const key = entryRelevantDate(e).slice(0, 7);
      if (!map.has(key)) map.set(key, { key, tasks: 0, events: 0, notes: 0, total: 0 });
      const g = map.get(key);
      g[e.type + "s"] = (g[e.type + "s"] || 0) + 1;
      g.total += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [entries]);

  return (
    <section aria-label="Index" style={{ maxWidth: 640 }}>
      <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: "0 0 4px" }}>Index</h2>
      <p style={{ fontFamily: fontMono, fontSize: 11, color: C.inkFaint, margin: "0 0 20px" }}>
        Every month you've logged something, with a way back in.
      </p>

      {grouped.length === 0 ? (
        <p style={{ fontFamily: fontBody, fontSize: 13, color: C.inkFaint, fontStyle: "italic", padding: "24px 0", textAlign: "center", border: `1px dashed ${C.rule}`, borderRadius: 8 }}>
          Nothing logged yet. Start in the Daily Log.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {grouped.map((g) => (
            <li
              key={g.key}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: `1px solid ${C.rule}`, borderRadius: 8, background: "rgba(255,255,255,0.4)" }}
            >
              <div>
                <p style={{ fontFamily: fontBody, fontSize: 15, margin: 0, color: C.ink }}>{monthLabelFromKey(g.key)}</p>
                <p style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, margin: "2px 0 0" }}>
                  {g.tasks || 0} tasks · {g.events || 0} events · {g.notes || 0} notes
                </p>
              </div>
              <button
                onClick={() => onJumpToMonth(g.key)}
                style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer", flexShrink: 0 }}
              >
                View →
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ================= Future Log =================
function FutureLogPage({ entries, addEntry }) {
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => getMonthInfo(i)), []);
  const [text, setText] = useState("");
  const [type, setType] = useState("task");
  const [date, setDate] = useState("");
  const canAdd = text.trim() && date;

  async function handleAdd() {
    if (!canAdd) return;
    await addEntry(text.trim(), type, type === "event" ? { eventDate: date } : { dueDate: date });
    setText("");
    setDate("");
  }

  function itemsForMonth(key) {
    return entries
      .filter((e) => (e.type === "task" || e.type === "goal" || e.type === "event") && entryRelevantDate(e).startsWith(key))
      .sort((a, b) => entryRelevantDate(a).localeCompare(entryRelevantDate(b)));
  }

  return (
    <section aria-label="Future Log">
      <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: "0 0 4px" }}>Future Log</h2>
      <p style={{ fontFamily: fontMono, fontSize: 11, color: C.inkFaint, margin: "0 0 16px" }}>
        The next twelve months, at a glance.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 12, background: "rgba(255,255,255,0.35)", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(ENTRY_TYPES)
            .filter(([k]) => k !== "note")
            .map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                aria-pressed={type === key}
                style={{
                  fontFamily: fontMono,
                  fontSize: 11,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${type === key ? C.ink : C.rule}`,
                  background: type === key ? C.ink : "transparent",
                  color: type === key ? C.paper : C.inkSoft,
                  cursor: "pointer",
                }}
              >
                {meta.glyph} {meta.label}
              </button>
            ))}
        </div>
        <div>
          <label style={fieldLabelStyle}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...fieldInputStyle, width: 160 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={fieldLabelStyle}>What's coming up?</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={fieldInputStyle}
            placeholder="Renew passport…"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", padding: "7px 16px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: canAdd ? "pointer" : "not-allowed", opacity: canAdd ? 1 : 0.4 }}
        >
          Add
        </button>
      </div>

      <div className="marginalia-future-grid">
        {months.map((m) => {
          const items = itemsForMonth(m.key);
          return (
            <div key={m.key} style={{ border: `1px solid ${C.rule}`, borderRadius: 8, padding: 12, background: "rgba(255,255,255,0.4)" }}>
              <p style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkSoft, margin: "0 0 8px" }}>{m.label}</p>
              {items.length === 0 ? (
                <p style={{ fontFamily: fontBody, fontSize: 12, color: C.inkFaint, fontStyle: "italic", margin: 0 }}>Nothing yet</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {items.map((e) => (
                    <li key={e.id} style={{ fontFamily: fontBody, fontSize: 12.5, color: C.ink, display: "flex", gap: 5 }}>
                      <span style={{ color: C.inkFaint, flexShrink: 0 }}>{ENTRY_TYPES[e.type].glyph}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.text}
                        <span style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint }}> · {formatDateShort(entryRelevantDate(e))}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ================= Monthly Log =================
function MonthlyLogPage({ entries, addEntry, toggleEntryDone, deleteEntry, monthOffset, setMonthOffset }) {
  const info = getMonthInfo(monthOffset);
  const numDays = daysInMonthCount(info.year, info.monthIndex);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const isCurrentMonth = monthOffset === 0;
  const todayNum = isCurrentMonth ? new Date().getDate() : -1;

  const [openDay, setOpenDay] = useState(null);
  const [dayDraft, setDayDraft] = useState({ text: "", type: "event", time: "" });
  const [dumpText, setDumpText] = useState("");

  function dayItems(day) {
    const iso = isoFor(info.year, info.monthIndex, day);
    return entries.filter((e) => (e.type === "event" && e.eventDate === iso) || ((e.type === "task" || e.type === "goal") && e.dueDate === iso));
  }

  const brainDump = entries.filter((e) => (e.type === "task" || e.type === "goal") && !e.done && (!e.dueDate || e.dueDate.startsWith(info.key)));

  async function submitDay(day) {
    if (!dayDraft.text.trim()) return;
    const iso = isoFor(info.year, info.monthIndex, day);
    await addEntry(dayDraft.text.trim(), dayDraft.type, dayDraft.type === "event" ? { eventDate: iso, eventTime: dayDraft.time || null } : { dueDate: iso });
    setDayDraft({ text: "", type: "event", time: "" });
    setOpenDay(null);
  }

  async function submitDump() {
    if (!dumpText.trim()) return;
    await addEntry(dumpText.trim(), "task", {});
    setDumpText("");
  }

  return (
    <section aria-label="Monthly Log">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>{info.label}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setMonthOffset((n) => n - 1)} aria-label="Previous month" style={navBtnStyle}>‹</button>
          <button
            onClick={() => setMonthOffset(0)}
            aria-label="Go to current month"
            disabled={isCurrentMonth}
            style={{ ...navBtnStyle, width: "auto", padding: "0 10px", opacity: isCurrentMonth ? 0.35 : 1, cursor: isCurrentMonth ? "default" : "pointer" }}
          >
            Today
          </button>
          <button onClick={() => setMonthOffset((n) => n + 1)} aria-label="Next month" style={navBtnStyle}>›</button>
        </div>
      </div>

      <div className="marginalia-monthly">
        {/* Left: days down the margin */}
        <div style={{ border: `1px solid ${C.rule}`, borderRadius: 8, background: "rgba(255,255,255,0.4)", overflow: "hidden" }}>
          {days.map((day) => {
            const weekday = new Date(info.year, info.monthIndex, day).toLocaleDateString(undefined, { weekday: "short" });
            const items = dayItems(day);
            const isToday = day === todayNum;
            const isOpen = openDay === day;
            return (
              <div key={day} style={{ borderBottom: `1px solid ${C.rule}`, background: isToday ? "rgba(38,54,92,0.05)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px" }}>
                  <div style={{ width: 40, flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, color: isToday ? C.accent : C.ink }}>{day}</div>
                    <div style={{ fontFamily: fontMono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase" }}>{weekday}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {items.length === 0 ? (
                      <div style={{ height: 22 }} />
                    ) : (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        {items.map((e) => (
                          <li key={e.id} style={{ fontFamily: fontBody, fontSize: 13, color: C.ink, display: "flex", gap: 5 }}>
                            <span style={{ color: C.inkFaint }}>{ENTRY_TYPES[e.type].glyph}</span>
                            <span>{e.text}</span>
                            {e.type === "event" && e.eventTime && (
                              <span style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint }}>{formatTimeShort(e.eventTime)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => setOpenDay(isOpen ? null : day)}
                    aria-label={`Add item on ${monthLabelFromKey(info.key)} ${day}`}
                    aria-expanded={isOpen}
                    style={{ fontFamily: fontMono, fontSize: 13, color: C.inkFaint, background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: "0 2px" }}
                  >
                    {isOpen ? "×" : "+"}
                  </button>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 12px 12px 62px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["event", "task", "goal"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setDayDraft((d) => ({ ...d, type: t }))}
                          aria-pressed={dayDraft.type === t}
                          style={{
                            fontFamily: fontMono,
                            fontSize: 10,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid ${dayDraft.type === t ? C.ink : C.rule}`,
                            background: dayDraft.type === t ? C.ink : "transparent",
                            color: dayDraft.type === t ? C.paper : C.inkSoft,
                            cursor: "pointer",
                          }}
                        >
                          {ENTRY_TYPES[t].glyph} {ENTRY_TYPES[t].label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={dayDraft.text}
                      onChange={(e) => setDayDraft((d) => ({ ...d, text: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && submitDay(day)}
                      placeholder="What's happening?"
                      style={{ ...fieldInputStyle, width: 160 }}
                    />
                    {dayDraft.type === "event" && (
                      <input
                        type="time"
                        value={dayDraft.time}
                        onChange={(e) => setDayDraft((d) => ({ ...d, time: e.target.value }))}
                        style={{ ...fieldInputStyle, width: 110 }}
                      />
                    )}
                    <button
                      onClick={() => submitDay(day)}
                      disabled={!dayDraft.text.trim()}
                      style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", padding: "6px 10px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer", opacity: dayDraft.text.trim() ? 1 : 0.4 }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: brain dump */}
        <div>
          <p style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint, margin: "0 0 8px" }}>
            Brain dump — {info.label}
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <input
              value={dumpText}
              onChange={(e) => setDumpText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitDump()}
              placeholder="Anything to tackle this month…"
              style={{ ...fieldInputStyle, flex: 1 }}
            />
            <button
              onClick={submitDump}
              disabled={!dumpText.trim()}
              style={{ fontFamily: fontMono, fontSize: 11, textTransform: "uppercase", padding: "6px 12px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer", opacity: dumpText.trim() ? 1 : 0.4, flexShrink: 0 }}
            >
              Add
            </button>
          </div>
          {brainDump.length === 0 ? (
            <p style={{ fontFamily: fontBody, fontSize: 13, color: C.inkFaint, fontStyle: "italic", padding: "20px 0", textAlign: "center", border: `1px dashed ${C.rule}`, borderRadius: 8 }}>
              No open tasks for this month.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {brainDump.map((e) => (
                <li key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6 }}>
                  <button
                    onClick={() => toggleEntryDone(e)}
                    aria-label="Mark task done"
                    style={{ fontFamily: fontDisplay, fontSize: 14, width: 18, color: C.inkSoft, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                  >
                    •
                  </button>
                  <span style={{ fontFamily: fontBody, fontSize: 13.5, flex: 1, color: C.ink }}>{e.text}</span>
                  {e.dueDate && <span style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, flexShrink: 0 }}>{formatDateShort(e.dueDate)}</span>}
                  <button
                    onClick={() => deleteEntry(e)}
                    aria-label={`Delete task: ${e.text}`}
                    style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ================= Daily Log =================
function DailyLogPage(props) {
  const { entries, blocks, addEntry, toggleEntryDone, deleteEntry, updateEntry, scheduleEntry, unscheduleBlock, resizeBlock, moveBlock, dragEntryId, setDragEntryId } = props;
  return (
    <div className="marginalia-grid">
      <Journal
        entries={entries}
        addEntry={addEntry}
        toggleEntryDone={toggleEntryDone}
        deleteEntry={deleteEntry}
        updateEntry={updateEntry}
        dragEntryId={dragEntryId}
        setDragEntryId={setDragEntryId}
      />
      <DayAgenda
        entries={entries}
        blocks={blocks}
        scheduleEntry={scheduleEntry}
        unscheduleBlock={unscheduleBlock}
        resizeBlock={resizeBlock}
        moveBlock={moveBlock}
        addEntry={addEntry}
        dragEntryId={dragEntryId}
        setDragEntryId={setDragEntryId}
      />
    </div>
  );
}

function Journal({ entries, addEntry, toggleEntryDone, deleteEntry, updateEntry, dragEntryId, setDragEntryId }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("task");
  const [signifier, setSignifier] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const canSubmit = text.trim() && (type !== "event" || eventDate);

  function resetForm() {
    setText("");
    setSignifier("none");
    setDueDate("");
    setEventDate("");
    setEventTime("");
    setEventLocation("");
  }

  async function handleLogEntry() {
    if (!canSubmit) return;
    await addEntry(text.trim(), type, {
      signifier: signifier === "none" ? null : signifier,
      dueDate: type === "task" && dueDate ? dueDate : null,
      eventDate: type === "event" ? eventDate : null,
      eventTime: type === "event" ? eventTime : null,
      eventLocation: type === "event" ? eventLocation : null,
    });
    resetForm();
  }

  return (
    <section aria-label="Bullet journal">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>Rapid Log</h2>
        <span style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkFaint }}>
          {entries.length} entries
        </span>
      </div>

      <div style={{ marginBottom: 24, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 12, background: "rgba(255,255,255,0.35)" }}>
        <div role="radiogroup" aria-label="Entry type" style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {Object.entries(ENTRY_TYPES).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              role="radio"
              aria-checked={type === key}
              onClick={() => setType(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: fontMono,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${type === key ? C.ink : C.rule}`,
                background: type === key ? C.ink : "transparent",
                color: type === key ? C.paper : C.inkSoft,
                cursor: "pointer",
              }}
            >
              <span aria-hidden="true">{meta.glyph}</span>
              {meta.label}
            </button>
          ))}

          <span style={{ width: 1, background: C.rule, margin: "0 2px" }} />

          {Object.entries(SIGNIFIERS).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              onClick={() => setSignifier(key)}
              aria-pressed={signifier === key}
              title={meta.label}
              aria-label={`Signifier: ${meta.label}`}
              style={{
                fontFamily: fontMono,
                fontSize: 11,
                width: 26,
                padding: "4px 0",
                borderRadius: 999,
                border: `1px solid ${signifier === key ? C.accent : C.rule}`,
                background: signifier === key ? C.accent : "transparent",
                color: signifier === key ? C.paper : C.inkSoft,
                cursor: "pointer",
              }}
            >
              {meta.char || "–"}
            </button>
          ))}
        </div>

        {type === "event" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={fieldLabelStyle} htmlFor="event-date">Date *</label>
              <input id="event-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={fieldInputStyle} required />
            </div>
            <div>
              <label style={fieldLabelStyle} htmlFor="event-time">Time</label>
              <input id="event-time" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={fieldInputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={fieldLabelStyle} htmlFor="event-location">Location</label>
              <input id="event-location" type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Where?" style={fieldInputStyle} />
            </div>
          </div>
        )}

        {(type === "task" || type === "goal") && (
          <div style={{ marginBottom: 10, maxWidth: 200 }}>
            <label style={fieldLabelStyle} htmlFor="due-date">Due date (optional)</label>
            <input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={fieldInputStyle} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <label htmlFor="new-entry" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            New journal entry
          </label>
          <input
            id="new-entry"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogEntry();
            }}
            placeholder="Capture a thought…"
            style={{ ...fieldInputStyle, flex: 1, fontSize: 14, padding: "8px 12px" }}
          />
          <button
            type="button"
            onClick={handleLogEntry}
            disabled={!canSubmit}
            style={{
              fontFamily: fontMono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: C.accent,
              color: C.paper,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.4,
              flexShrink: 0,
            }}
          >
            Log
          </button>
        </div>
        {type === "event" && !eventDate && (
          <p style={{ fontFamily: fontMono, fontSize: 10, color: C.inkFaint, margin: "6px 0 0" }}>Events need a date.</p>
        )}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }} aria-label="Journal entries">
        {entries.length === 0 && (
          <li style={{ fontFamily: fontBody, fontSize: 13, color: C.inkFaint, fontStyle: "italic", padding: "24px 0", textAlign: "center", border: `1px dashed ${C.rule}`, borderRadius: 8 }}>
            The page is blank. Write down what's on your mind.
          </li>
        )}
        {[...entries].sort((a,b) => (a.type==='goal'?0:1) - (b.type==='goal'?0:1)).map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onToggle={() => toggleEntryDone(entry)}
            onDelete={() => deleteEntry(entry)}
            onSave={(patch) => updateEntry(entry, patch)}
            isDragging={dragEntryId === entry.id}
            onDragStart={() => setDragEntryId(entry.id)}
            onDragEnd={() => setDragEntryId(null)}
          />
        ))}
      </ul>
    </section>
  );
}

function EntryRow({ entry, onToggle, onDelete, onSave, isDragging, onDragStart, onDragEnd }) {
  const [hover, setHover] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    text: entry.text,
    signifier: entry.signifier || "none",
    dueDate: entry.dueDate || "",
    eventDate: entry.eventDate || "",
    eventTime: entry.eventTime || "",
    eventLocation: entry.eventLocation || "",
  }));
  const inputRef = useRef(null);
  const meta = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.note;
  const signifierMeta = SIGNIFIERS[entry.signifier || "none"];
  const draggable = (entry.type === "task" || entry.type === "goal" || entry.type === "event") && !entry.scheduledBlockId;

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function handleDragStart(e) {
    e.dataTransfer.setData("text/entry-id", entry.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  }

  function startEdit() {
    setDraft({
      text: entry.text,
      signifier: entry.signifier || "none",
      dueDate: entry.dueDate || "",
      eventDate: entry.eventDate || "",
      eventTime: entry.eventTime || "",
      eventLocation: entry.eventLocation || "",
    });
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.text.trim();
    if (!trimmed) {
      setIsEditing(false);
      return;
    }
    onSave({
      text: trimmed,
      signifier: draft.signifier === "none" ? null : draft.signifier,
      dueDate: (entry.type === "task" || entry.type === "goal") ? draft.dueDate || null : entry.dueDate,
      eventDate: entry.type === "event" ? draft.eventDate || null : entry.eventDate,
      eventTime: entry.type === "event" ? draft.eventTime || null : entry.eventTime,
      eventLocation: entry.type === "event" ? draft.eventLocation || null : entry.eventLocation,
    });
    setIsEditing(false);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  const metaLine = [];
  if (entry.type === "event" && entry.eventDate) {
    metaLine.push(formatDateShort(entry.eventDate) + (entry.eventTime ? ` · ${formatTimeShort(entry.eventTime)}` : ""));
  }
  if (entry.type === "event" && entry.eventLocation) metaLine.push(entry.eventLocation);
  if ((entry.type === "task" || entry.type === "goal") && entry.dueDate) metaLine.push(`Due ${formatDateShort(entry.dueDate)}`);

  return (
    <li
      draggable={draggable && !isEditing}
      onDragStart={draggable && !isEditing ? handleDragStart : undefined}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "6px 8px",
        borderRadius: 6,
        border: `1px solid ${hover || isEditing ? C.rule : "transparent"}`,
        background: hover || isEditing ? "rgba(255,255,255,0.5)" : "transparent",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: fontDisplay, fontSize: 15, width: 20, textAlign: "center", color: C.inkSoft, flexShrink: 0 }}>{meta.glyph}</span>
            <input
              ref={inputRef}
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              aria-label="Edit entry text"
              style={{ ...fieldInputStyle, flex: 1, fontSize: 14 }}
            />
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(SIGNIFIERS).map(([key, sm]) => (
              <button
                type="button"
                key={key}
                onClick={() => setDraft((d) => ({ ...d, signifier: key }))}
                aria-pressed={draft.signifier === key}
                title={sm.label}
                style={{
                  fontFamily: fontMono,
                  fontSize: 10,
                  width: 24,
                  padding: "3px 0",
                  borderRadius: 999,
                  border: `1px solid ${draft.signifier === key ? C.accent : C.rule}`,
                  background: draft.signifier === key ? C.accent : "transparent",
                  color: draft.signifier === key ? C.paper : C.inkSoft,
                  cursor: "pointer",
                }}
              >
                {sm.char || "–"}
              </button>
            ))}
          </div>

          {entry.type === "event" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div>
                <label style={fieldLabelStyle}>Date</label>
                <input type="date" value={draft.eventDate} onChange={(e) => setDraft((d) => ({ ...d, eventDate: e.target.value }))} style={fieldInputStyle} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Time</label>
                <input type="time" value={draft.eventTime} onChange={(e) => setDraft((d) => ({ ...d, eventTime: e.target.value }))} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={fieldLabelStyle}>Location</label>
                <input type="text" value={draft.eventLocation} onChange={(e) => setDraft((d) => ({ ...d, eventLocation: e.target.value }))} style={fieldInputStyle} />
              </div>
            </div>
          )}

          {(entry.type === "task" || entry.type === "goal") && (
            <div style={{ maxWidth: 180 }}>
              <label style={fieldLabelStyle}>Due date</label>
              <input type="date" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} style={fieldInputStyle} />
            </div>
          )}

          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={cancelEdit}
              style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.rule}`, background: "transparent", color: C.inkSoft, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitEdit}
              style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 6, border: "none", background: C.accent, color: C.paper, cursor: "pointer" }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <button
            onClick={onToggle}
            aria-label={entry.done ? "Mark entry as not done" : "Mark entry as done"}
            aria-pressed={!!entry.done}
            style={{ fontFamily: fontDisplay, fontSize: 15, width: 20, textAlign: "center", color: C.inkSoft, background: "none", border: "none", cursor: "pointer", flexShrink: 0, paddingTop: 1 }}
          >
            {entry.done ? "×" : meta.glyph}
          </button>

          <div style={{ flex: 1, minWidth: 0, cursor: "text" }} onDoubleClick={startEdit}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              {signifierMeta.char && (
                <span aria-label={signifierMeta.label} title={signifierMeta.label} style={{ fontFamily: fontMono, fontSize: 11, color: C.accent }}>
                  {signifierMeta.char}
                </span>
              )}
              <span style={{ fontFamily: fontBody, fontSize: 14, color: entry.done ? C.inkFaint : C.ink, textDecoration: entry.done ? "line-through" : "none" }}>
                {entry.text}
              </span>
            </div>
            {metaLine.length > 0 && (
              <p style={{ margin: "1px 0 0", fontFamily: fontMono, fontSize: 10, color: C.inkFaint }}>{metaLine.join(" · ")}</p>
            )}
          </div>

          {entry.scheduledBlockId && (
            <span aria-label="Scheduled on calendar" title="Scheduled on calendar" style={{ fontFamily: fontMono, fontSize: 12, color: C.accent, flexShrink: 0 }}>
              →
            </span>
          )}

          <button
            onClick={startEdit}
            aria-label={`Edit entry: ${entry.text}`}
            style={{ opacity: hover ? 1 : 0, transition: "opacity 0.15s", color: C.inkFaint, background: "none", border: "none", fontFamily: fontMono, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
          >
            ✎
          </button>
          <button
            onClick={onDelete}
            aria-label={`Delete entry: ${entry.text}`}
            style={{ opacity: hover ? 1 : 0, transition: "opacity 0.15s", color: C.inkFaint, background: "none", border: "none", fontFamily: fontMono, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

// ================= Day Agenda (single-day time-blocker) =================
function DayAgenda({ entries, blocks, scheduleEntry, unscheduleBlock, resizeBlock, moveBlock, addEntry, dragEntryId, setDragEntryId }) {
  const entryById = useMemo(() => Object.fromEntries(entries.map((e) => [e.id, e])), [entries]);
  const [dayOffset, setDayOffset] = useState(0);
  const [hoverSlot, setHoverSlot] = useState(null);
  const [dragBlockId, setDragBlockId] = useState(null);
  const resizingRef = useRef(null);
  const [, forceTick] = useState(0);

  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dayOffset]);
  const dateStr = toISODate(date);
  const isToday = dayOffset === 0;
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const slotIndices = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);
  const dayBlocks = blocks.filter((b) => b.date === dateStr);

  async function handleDrop(e, slotIndex) {
    e.preventDefault();
    setHoverSlot(null);
    const blockId = e.dataTransfer.getData("text/block-id");
    const entryId = e.dataTransfer.getData("text/entry-id");
    if (blockId) {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      await moveBlock(block, dateStr, slotIndex * SLOT_MINUTES);
      setDragBlockId(null);
      return;
    }
    if (entryId) {
      const entry = entryById[entryId];
      if (!entry || entry.scheduledBlockId) return;
      await scheduleEntry(entry, dateStr, slotIndex * SLOT_MINUTES, SLOT_MINUTES);
      setDragEntryId(null);
    }
  }

  async function handleSlotClick(slotIndex) {
    const label = window.prompt("Block label:");
    if (!label || !label.trim()) return;
    await addEntry(label.trim(), "event", { eventDate: dateStr, eventTime: startMinuteToHHMM(slotIndex * SLOT_MINUTES) });
  }

  function handleBlockDragStart(e, block) {
    e.dataTransfer.setData("text/block-id", block.id);
    e.dataTransfer.effectAllowed = "move";
    setDragBlockId(block.id);
  }

  function startResize(block, e) {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = { block, startY: e.clientY, startDuration: block.durationMinutes, liveDuration: block.durationMinutes };
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  }

  function onResizeMove(e) {
    const ctx = resizingRef.current;
    if (!ctx) return;
    const deltaY = e.clientY - ctx.startY;
    const deltaSlots = Math.round(deltaY / ROW_HEIGHT);
    ctx.liveDuration = Math.max(SLOT_MINUTES, ctx.startDuration + deltaSlots * SLOT_MINUTES);
    forceTick((n) => n + 1);
  }

  async function onResizeEnd() {
    const ctx = resizingRef.current;
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeEnd);
    if (ctx && ctx.liveDuration !== ctx.startDuration) {
      await resizeBlock(ctx.block, ctx.liveDuration);
    }
    resizingRef.current = null;
    forceTick((n) => n + 1);
  }

  return (
    <section aria-label="Daily time-blocking agenda">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>Today's Schedule</h2>
          <span style={{ fontFamily: fontMono, fontSize: 11, color: C.inkSoft }}>{dayLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setDayOffset((n) => n - 1)} aria-label="Previous day" style={navBtnStyle}>‹</button>
          <button
            onClick={() => setDayOffset(0)}
            aria-label="Go to today"
            disabled={isToday}
            style={{ ...navBtnStyle, width: "auto", padding: "0 10px", opacity: isToday ? 0.35 : 1, cursor: isToday ? "default" : "pointer" }}
          >
            Today
          </button>
          <button onClick={() => setDayOffset((n) => n + 1)} aria-label="Next day" style={navBtnStyle}>›</button>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.rule}`, borderRadius: 8, background: "rgba(255,255,255,0.4)", position: "relative", maxWidth: 480 }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr" }}>
          {slotIndices.map((slotIndex) => {
            const isHover = hoverSlot === slotIndex;
            return (
              <div className="contents" key={slotIndex}>
                <div
                  style={{
                    borderRight: `1px solid ${C.rule}`,
                    borderBottom: `1px solid ${C.rule}`,
                    fontSize: 9,
                    fontFamily: fontMono,
                    color: C.inkFaint,
                    textAlign: "right",
                    paddingRight: 6,
                    height: ROW_HEIGHT,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                  }}
                >
                  {slotIndex % 2 === 0 ? minutesToLabel(slotIndex * SLOT_MINUTES) : ""}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${dayLabel} at ${minutesToLabel(slotIndex * SLOT_MINUTES)}`}
                  onClick={() => handleSlotClick(slotIndex)}
                  onKeyDown={(e) => (e.key === "Enter" ? handleSlotClick(slotIndex) : null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverSlot(slotIndex);
                  }}
                  onDragLeave={() => setHoverSlot(null)}
                  onDrop={(e) => handleDrop(e, slotIndex)}
                  style={{
                    borderBottom: `1px solid ${C.rule}`,
                    height: ROW_HEIGHT,
                    cursor: "pointer",
                    background: isHover ? "rgba(38,54,92,0.2)" : "transparent",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ position: "absolute", top: 0, left: 56, right: 0, bottom: 0, pointerEvents: "none" }}>
          {dayBlocks.map((block) => {
            const entry = entryById[block.entryId];
            if (!entry) return null;
            const isResizing = resizingRef.current?.block.id === block.id;
            const duration = isResizing ? resizingRef.current.liveDuration : block.durationMinutes;
            const top = (block.startMinute / SLOT_MINUTES) * ROW_HEIGHT;
            const height = (duration / SLOT_MINUTES) * ROW_HEIGHT;
            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => handleBlockDragStart(e, block)}
                onDragEnd={() => setDragBlockId(null)}
                title={entry.eventLocation ? `${entry.text} — ${entry.eventLocation}` : entry.text}
                style={{
                  pointerEvents: "auto",
                  position: "absolute",
                  left: 2,
                  right: 2,
                  top,
                  height,
                  borderRadius: 6,
                  background: C.accent,
                  color: C.paper,
                  padding: "2px 8px",
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  opacity: dragBlockId === block.id ? 0.4 : 1,
                  cursor: "grab",
                }}
              >
                <p style={{ fontFamily: fontMono, fontSize: 11, lineHeight: 1.3, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.text}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    unscheduleBlock(block);
                  }}
                  aria-label={`Remove ${entry.text} from calendar`}
                  style={{ position: "absolute", top: 2, right: 4, background: "none", border: "none", color: C.paper, fontSize: 11, cursor: "pointer", opacity: 0.7 }}
                >
                  ✕
                </button>
                <div
                  onMouseDown={(e) => startResize(block, e)}
                  role="separator"
                  aria-label={`Resize ${entry.text} block`}
                  style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, cursor: "ns-resize" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ================= Weekly Log =================
function WeeklyLogPage({ entries, addEntry, toggleEntryDone, deleteEntry, updateEntry, dragEntryId, setDragEntryId, scheduleEntry }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + (weekOffset * 7));
    
    // Create [Today-2, Today-1, Today, Today+1, Today+2]
    return [-2, -1, 0, 1, 2].map(offset => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d;
    });
  }, [weekOffset]);

  const [openDay, setOpenDay] = useState(null);
  const [dayDraft, setDayDraft] = useState({ text: "", type: "task", time: "" });

  function dayItems(date) {
    const iso = toISODate(date);
    return [...entries].filter((e) => (e.type === "event" && e.eventDate === iso) || ((e.type === "task" || e.type === "goal") && e.dueDate === iso))
      .sort((a, b) => (a.type === 'goal' ? 0 : 1) - (b.type === 'goal' ? 0 : 1));
  }

  async function submitDay(date) {
    if (!dayDraft.text.trim()) return;
    const iso = toISODate(date);
    await addEntry(dayDraft.text.trim(), dayDraft.type, dayDraft.type === "event" ? { eventDate: iso, eventTime: dayDraft.time || null } : { dueDate: iso });
    setDayDraft({ text: "", type: "task", time: "" });
    setOpenDay(null);
  }

  return (
    <section aria-label="Weekly Log">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, margin: 0 }}>
          Week of {days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {days[4].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setWeekOffset((n) => n - 1)} aria-label="Previous week" style={navBtnStyle}>‹</button>
          <button
            onClick={() => setWeekOffset(0)}
            aria-label="Go to this week"
            disabled={weekOffset === 0}
            style={{ ...navBtnStyle, width: "auto", padding: "0 10px", opacity: weekOffset === 0 ? 0.35 : 1, cursor: weekOffset === 0 ? "default" : "pointer" }}
          >
            Current
          </button>
          <button onClick={() => setWeekOffset((n) => n + 1)} aria-label="Next week" style={navBtnStyle}>›</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {days.map((date, idx) => {
          const iso = toISODate(date);
          const isToday = iso === toISODate(new Date());
          const isOpen = openDay === iso;
          const items = dayItems(date);
          
          return (
            <div key={iso} style={{ border: `1px solid ${isToday ? C.accent : C.rule}`, borderRadius: 8, background: isToday ? "rgba(38,54,92,0.02)" : "rgba(255,255,255,0.4)", display: "flex", flexDirection: "column", minHeight: 300 }}>
              <div style={{ padding: "12px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", color: isToday ? C.accent : C.inkFaint }}>
                    {date.toLocaleDateString(undefined, { weekday: "long" })}
                  </div>
                  <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, color: isToday ? C.accent : C.ink }}>
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
                <button
                  onClick={() => setOpenDay(isOpen ? null : iso)}
                  style={{ fontFamily: fontMono, fontSize: 16, color: C.inkFaint, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
                >
                  {isOpen ? "×" : "+"}
                </button>
              </div>
              
              <div style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: 4 }}>
                {isOpen && (
                  <div style={{ padding: "8px", background: "rgba(255,255,255,0.6)", borderRadius: 6, border: `1px solid ${C.rule}`, marginBottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["event", "task", "goal"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setDayDraft((d) => ({ ...d, type: t }))}
                          style={{
                            fontFamily: fontMono, fontSize: 10, padding: "2px 6px", borderRadius: 999,
                            border: `1px solid ${dayDraft.type === t ? C.ink : C.rule}`,
                            background: dayDraft.type === t ? C.ink : "transparent",
                            color: dayDraft.type === t ? C.paper : C.inkSoft, cursor: "pointer"
                          }}
                        >
                          {ENTRY_TYPES[t].glyph}
                        </button>
                      ))}
                    </div>
                    <input
                      value={dayDraft.text}
                      onChange={(e) => setDayDraft((d) => ({ ...d, text: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && submitDay(date)}
                      placeholder="Add item..."
                      style={{ ...fieldInputStyle, padding: "4px 8px", fontSize: 12 }}
                    />
                    {dayDraft.type === "event" && (
                      <input
                        type="time"
                        value={dayDraft.time}
                        onChange={(e) => setDayDraft((d) => ({ ...d, time: e.target.value }))}
                        style={{ ...fieldInputStyle, padding: "4px 8px", fontSize: 12 }}
                      />
                    )}
                    <button
                      onClick={() => submitDay(date)}
                      disabled={!dayDraft.text.trim()}
                      style={{ fontFamily: fontMono, fontSize: 10, textTransform: "uppercase", padding: "4px", borderRadius: 4, border: "none", background: C.accent, color: C.paper, cursor: "pointer", opacity: dayDraft.text.trim() ? 1 : 0.4 }}
                    >
                      Add
                    </button>
                  </div>
                )}
                
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  {items.length === 0 && !isOpen && (
                    <li style={{ fontFamily: fontBody, fontSize: 12, color: C.inkFaint, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>Empty</li>
                  )}
                  {items.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onToggle={() => toggleEntryDone(entry)}
                      onDelete={() => deleteEntry(entry)}
                      onSave={(patch) => updateEntry(entry, patch)}
                      isDragging={dragEntryId === entry.id}
                      onDragStart={() => setDragEntryId(entry.id)}
                      onDragEnd={() => setDragEntryId(null)}
                    />
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
