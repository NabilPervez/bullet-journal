import { useState, useEffect } from "react";
import { loadList, saveList } from "./lib/storage";
import { uid } from "./lib/model";
import { SLOT_MINUTES, DEFAULT_EVENT_DURATION } from "./lib/constants";
import { hhmmToStartMinute, startMinuteToHHMM, monthOffsetFromKey } from "./lib/dates";
import { C, fontBody, fontMono } from "./theme";
import { Nav } from "./components/Nav";
import { Header } from "./components/Header";
import { IndexPage } from "./components/IndexPage";
import { FutureLogPage } from "./components/FutureLogPage";
import { MonthlyLogPage } from "./components/MonthlyLogPage";
import { WeeklyLogPage } from "./components/WeeklyLogPage";
import { DailyLogPage } from "./components/DailyLogPage";

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
    </div>
  );
}
