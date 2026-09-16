import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { loadJournal, saveJournal } from "./lib/storage";
import { migrate, SCHEMA_VERSION } from "./lib/migrations";
import { initialState, journalReducer } from "./lib/journalReducer";
import { uid } from "./lib/model";
import { SLOT_MINUTES } from "./lib/constants";
import { monthOffsetFromKey } from "./lib/dates";
import { Nav } from "./components/Nav";
import { Header } from "./components/Header";
import { UndoToast } from "./components/UndoToast";
import { CaptureButton, CaptureSheet } from "./components/CaptureSheet";
import { IndexPage } from "./components/IndexPage";
import { FutureLogPage } from "./components/FutureLogPage";
import { MonthlyLogPage } from "./components/MonthlyLogPage";
import { WeeklyLogPage } from "./components/WeeklyLogPage";
import { DailyLogPage } from "./components/DailyLogPage";
import { useIsCompact } from "./hooks/useViewport";
import { useTheme } from "./hooks/useTheme";

const VIEWS = ["index", "future", "monthly", "weekly", "daily"];
const SAVE_DEBOUNCE_MS = 200;

export default function App() {
  const [state, dispatch] = useReducer(journalReducer, initialState);
  const { entries, blocks, status, version, saveError, undo } = state;

  const [view, setView] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("view");
    return VIEWS.includes(param) ? param : "daily";
  });
  const [monthOffset, setMonthOffset] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const compact = useIsCompact();
  const { theme, toggle: toggleTheme } = useTheme();

  // Load once, run any pending schema migration, then hand the result to the
  // reducer. Nothing else reads or writes storage.
  useEffect(() => {
    const stored = loadJournal();
    const migrated = migrate(stored, stored.version);
    dispatch({
      type: "hydrate",
      entries: migrated.entries,
      blocks: migrated.blocks,
      version: migrated.version,
      readonly: stored.readonly,
    });
    if (stored.readonly) {
      console.warn("Marginalia: stored data could not be read; running read-only", stored.damaged);
    }
  }, []);

  // One writer. It watches the reduced state instead of being called from
  // eight different mutators, which is what made concurrent edits lose data.
  const saveTimer = useRef(null);
  useEffect(() => {
    if (status !== "ready") return undefined;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const result = saveJournal({ entries, blocks, version: version || SCHEMA_VERSION });
      dispatch(result.ok ? { type: "save-ok" } : { type: "save-failed", error: result.error });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(saveTimer.current);
  }, [entries, blocks, status, version]);

  const retrySave = useCallback(() => {
    const result = saveJournal({ entries, blocks, version: version || SCHEMA_VERSION });
    dispatch(result.ok ? { type: "save-ok" } : { type: "save-failed", error: result.error });
  }, [entries, blocks, version]);

  // ---- Action creators. Ids are generated here so the reducer stays pure. ----

  const addEntry = useCallback((text, type, meta = {}) => {
    const entry = {
      id: uid(),
      text,
      type,
      createdAt: Date.now(),
      done: false,
      scheduledBlockId: null,
      signifier: meta.signifier || null,
      dueDate: meta.dueDate || null,
      eventDate: meta.eventDate || null,
      eventTime: meta.eventTime || null,
      eventLocation: meta.eventLocation || null,
    };
    dispatch({ type: "add-entry", entry, blockId: uid() });
    return entry;
  }, []);

  const updateEntry = useCallback((entry, patch) => {
    dispatch({ type: "update-entry", id: entry.id, patch, blockId: uid() });
  }, []);

  const toggleEntryDone = useCallback((entry) => {
    dispatch({ type: "toggle-done", id: entry.id });
  }, []);

  const deleteEntry = useCallback((entry) => {
    dispatch({ type: "delete-entry", id: entry.id });
  }, []);

  const scheduleEntry = useCallback((entry, date, startMinute, durationMinutes = SLOT_MINUTES) => {
    dispatch({ type: "schedule-entry", entryId: entry.id, date, startMinute, durationMinutes, blockId: uid() });
  }, []);

  const moveBlock = useCallback((block, date, startMinute) => {
    dispatch({ type: "move-block", blockId: block.id, date, startMinute });
  }, []);

  const unscheduleBlock = useCallback((block) => {
    dispatch({ type: "unschedule-block", blockId: block.id });
  }, []);

  const resizeBlock = useCallback((block, durationMinutes) => {
    dispatch({ type: "resize-block", blockId: block.id, durationMinutes });
  }, []);

  // An imported journal goes through the same migration path as a stored
  // one, so an old export opens in a new version of the app.
  const importJournal = useCallback((parsed) => {
    const migrated = migrate({ entries: parsed.entries, blocks: parsed.blocks }, parsed.version);
    dispatch({
      type: "hydrate",
      entries: migrated.entries,
      blocks: migrated.blocks,
      version: migrated.version,
      readonly: false,
    });
  }, []);

  function jumpToMonth(key) {
    setMonthOffset(monthOffsetFromKey(key));
    setView("monthly");
  }

  if (status === "loading") {
    return (
      <div className="row" style={{ minHeight: "100svh", justifyContent: "center" }}>
        <p className="eyebrow">Opening the journal…</p>
      </div>
    );
  }

  const pageTitles = { index: "Index", future: "Future", monthly: "Month", weekly: "Week", daily: "Today" };

  return (
    <div className="app-shell">
      <Nav view={view} onChangeView={setView} />
      <div className="app-main">
        <Header
          pageTitle={pageTitles[view]}
          saveError={saveError}
          readonly={status === "readonly"}
          onRetrySave={retrySave}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="page">
          {view === "index" && (
            <IndexPage
              entries={entries}
              blocks={blocks}
              version={version || SCHEMA_VERSION}
              onJumpToMonth={jumpToMonth}
              onImport={importJournal}
            />
          )}
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
            />
          )}
        </main>
      </div>
      {/* Capture, in the thumb arc, from any log. */}
      {compact && view !== "index" && !capturing && <CaptureButton onOpen={() => setCapturing(true)} />}
      {capturing && <CaptureSheet addEntry={addEntry} onClose={() => setCapturing(false)} />}
      <UndoToast undo={undo} onUndo={() => dispatch({ type: "undo" })} onDismiss={() => dispatch({ type: "dismiss-undo" })} />
    </div>
  );
}
