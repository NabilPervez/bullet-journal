import { useCallback, useState } from "react";
import { SLOT_MINUTES } from "../lib/constants";
import { useDragSession } from "../hooks/useDragSession";
import { useIsCompact } from "../hooks/useViewport";
import { Journal } from "./Journal";
import { DayAgenda } from "./DayAgenda";
import { DragGhost } from "./DragGhost";
import { SchedulePicker } from "./SchedulePicker";
import { C, fontMono } from "../theme";

export function DailyLogPage({
  entries,
  blocks,
  addEntry,
  toggleEntryDone,
  deleteEntry,
  updateEntry,
  scheduleEntry,
  unscheduleBlock,
  resizeBlock,
  moveBlock,
}) {
  const [dayOffset, setDayOffset] = useState(0);
  const [pickerEntry, setPickerEntry] = useState(null);
  const [pane, setPane] = useState("log");
  const compact = useIsCompact();

  const handleDrop = useCallback(
    ({ payload, date, slotIndex }) => {
      const startMinute = slotIndex * SLOT_MINUTES;
      if (payload.kind === "block") {
        moveBlock(payload.block, date, startMinute);
      } else {
        scheduleEntry(payload.entry, date, startMinute, SLOT_MINUTES);
      }
    },
    [moveBlock, scheduleEntry]
  );

  const { drag, startDrag } = useDragSession(handleDrop);

  const startEntryDrag = useCallback(
    (event, entry) => startDrag(event, { kind: "entry", entry }, entry.text),
    [startDrag]
  );

  const journal = (
    <Journal
      entries={entries}
      addEntry={addEntry}
      toggleEntryDone={toggleEntryDone}
      deleteEntry={deleteEntry}
      updateEntry={updateEntry}
      draggingEntryId={drag?.payload?.kind === "entry" ? drag.payload.entry.id : null}
      onStartDrag={compact ? undefined : startEntryDrag}
      onSchedule={setPickerEntry}
      showComposer={!compact}
    />
  );

  const agenda = (
    <DayAgenda
      entries={entries}
      blocks={blocks}
      unscheduleBlock={unscheduleBlock}
      resizeBlock={resizeBlock}
      moveBlock={moveBlock}
      addEntry={addEntry}
      drag={drag}
      startDrag={startDrag}
      dayOffset={dayOffset}
      setDayOffset={setDayOffset}
      compact={compact}
    />
  );

  return (
    <>
      {/* Side by side there is room for both. On a phone, stacking them put
          the schedule below every entry in the journal. */}
      {compact ? (
        <div>
          <div role="tablist" aria-label="Daily log" style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {[
              ["log", "Log"],
              ["schedule", "Schedule"],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={pane === id}
                onClick={() => setPane(id)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  fontFamily: fontMono,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  borderRadius: 8,
                  border: `1px solid ${pane === id ? C.ink : C.rule}`,
                  background: pane === id ? C.ink : "transparent",
                  color: pane === id ? C.paper : C.inkSoft,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {pane === "log" ? journal : agenda}
        </div>
      ) : (
        <div className="marginalia-grid">
          {journal}
          {agenda}
        </div>
      )}

      <DragGhost drag={drag} />
      {pickerEntry && (
        <SchedulePicker
          entry={pickerEntry}
          blocks={blocks}
          onPick={(date, startMinute) => {
            scheduleEntry(pickerEntry, date, startMinute, SLOT_MINUTES);
            setPickerEntry(null);
          }}
          onClose={() => setPickerEntry(null)}
        />
      )}
    </>
  );
}
