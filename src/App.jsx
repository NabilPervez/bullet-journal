import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { isJournalKey, loadJournal, saveJournal } from "./lib/storage";
import { markExported, needsBackup, readBackupState, snoozeBackup } from "./lib/backup";
import { migrate, SCHEMA_VERSION } from "./lib/migrations";
import { initialState, journalReducer } from "./lib/journalReducer";
import { uid } from "./lib/model";
import { SLOT_MINUTES } from "./lib/constants";
import { monthOffsetFromKey, toISODate } from "./lib/dates";
import { anchorRepeat } from "./lib/recurrence";
import { Nav } from "./components/Nav";
import { Header } from "./components/Header";
import { UndoToast } from "./components/UndoToast";
import { CaptureButton, CaptureSheet } from "./components/CaptureSheet";
import { IndexPage } from "./components/IndexPage";
import { MonthlyLogPage } from "./components/MonthlyLogPage";
import { WeeklyLogPage } from "./components/WeeklyLogPage";
import { DailyLogPage } from "./components/DailyLogPage";
import { SettingsPage } from "./components/SettingsPage";
import { Onboarding } from "./components/Onboarding";
import { useIsCompact } from "./hooks/useViewport";
import { useTheme } from "./hooks/useTheme";
import { useOnboarding } from "./hooks/useOnboarding";
import { useToday } from "./hooks/useToday";

const VIEWS = ["index", "monthly", "weekly", "daily", "settings"];
const SAVE_DEBOUNCE_MS = 200;

export default function App() {
  const [state, dispatch] = useReducer(journalReducer, initialState);
  const { entries, blocks, status, version, saveError, undo } = state;

  const [view, setView] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("view");
    // Both ?view=future and ?view=index land on the same screen.
    if (param === "future") return "index";
    return VIEWS.includes(param) ? param : "daily";
  });
  const [indexTab] = useState(() =>
    new URLSearchParams(window.location.search).get("view") === "index" ? "index" : "future"
  );
  const [monthOffset, setMonthOffset] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const compact = useIsCompact();
  const { theme, setTheme, toggle: toggleTheme } = useTheme();
  const { showTour, finish: finishTour, replay: replayTour } = useOnboarding();
  // Re-renders every view when the date changes under an open app.
  const today = useToday();
  const [backup, setBackup] = useState(readBackupState);
  // Midday of today, not Date.now(): a reminder counted in days doesn't need
  // the clock, and render stays pure.
  const backupDue = needsBackup({ entryCount: entries.length, ...backup, now: new Date(`${today}T12:00`).getTime() });

  // Load once, run any pending schema migration, then hand the result to the
  // reducer. Nothing else reads or writes storage.
  const hydrateFromStorage = useCallback(() => {
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

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Another tab or the installed app saved. Take its journal rather than
  // saving this tab's stale copy over the top of it on the next edit.
  useEffect(() => {
    function onStorage(event) {
      if (event.storageArea === localStorage && isJournalKey(event.key)) hydrateFromStorage();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrateFromStorage]);

  // One writer. It watches the reduced state instead of being called from
  // eight different mutators, which is what made concurrent edits lose data.
  // The scroll region belongs to the app, not the document, so changing view
  // has to take it back to the top itself.
  const mainRef = useRef(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [view]);

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
      repeat: meta.repeat ? anchorRepeat(meta.repeat, meta.dueDate || meta.eventDate) : null,
      spawnedId: null,
    };
    dispatch({ type: "add-entry", entry, blockId: uid() });
    return entry;
  }, []);

  const updateEntry = useCallback((entry, patch) => {
    dispatch({ type: "update-entry", id: entry.id, patch, blockId: uid() });
  }, []);

  const toggleEntryDone = useCallback((entry) => {
    // Ids, today and now come in with the action so the reducer stays pure.
    dispatch({
      type: "toggle-done",
      id: entry.id,
      today: toISODate(new Date()),
      now: Date.now(),
      nextId: uid(),
      nextBlockId: uid(),
    });
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

  const dismissUndo = useCallback(() => dispatch({ type: "dismiss-undo" }), []);
  const undoLast = useCallback(() => dispatch({ type: "undo" }), []);

  const handleExported = useCallback(() => {
    markExported();
    setBackup(readBackupState());
  }, []);

  const handleSnoozeBackup = useCallback(() => {
    snoozeBackup();
    setBackup(readBackupState());
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

  const pageTitles = { index: "Future", monthly: "Month", weekly: "Week", daily: "Today", settings: "Settings" };

  return (
    <div className="app-shell">
      <Nav view={view} onChangeView={setView} />
      <div className="app-main" ref={mainRef}>
        <Header
          pageTitle={pageTitles[view]}
          saveError={saveError}
          readonly={status === "readonly"}
          onRetrySave={retrySave}
          backupDue={backupDue}
          onExport={() => setView("settings")}
          onSnoozeBackup={handleSnoozeBackup}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setView("settings")}
          settingsOpen={view === "settings"}
        />
        <main className="page">
          <div className="page-turn" key={view}>
          {view === "index" && (
            <IndexPage
              entries={entries}
              addEntry={addEntry}
              onJumpToMonth={jumpToMonth}
              initialTab={indexTab}
            />
          )}
          {view === "settings" && (
            <SettingsPage
              entries={entries}
              blocks={blocks}
              version={version || SCHEMA_VERSION}
              onImport={importJournal}
              onExported={handleExported}
              theme={theme}
              onSetTheme={setTheme}
              onReplayTour={replayTour}
            />
          )}
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
          </div>
        </main>
      </div>
      {/* Capture, in the thumb arc, from any log. */}
      {compact && view !== "index" && view !== "settings" && !capturing && !showTour && (
        <CaptureButton onOpen={() => setCapturing(true)} />
      )}
      {capturing && <CaptureSheet addEntry={addEntry} onClose={() => setCapturing(false)} />}
      <UndoToast undo={undo} onUndo={undoLast} onDismiss={dismissUndo} />
      {showTour && <Onboarding onDone={finishTour} />}
    </div>
  );
}
