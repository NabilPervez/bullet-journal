import { useCallback, useState } from "react";
import { SLOT_MINUTES } from "../lib/constants";
import { useDragSession } from "../hooks/useDragSession";
import { Journal } from "./Journal";
import { DayAgenda } from "./DayAgenda";
import { DragGhost } from "./DragGhost";
import { SchedulePicker } from "./SchedulePicker";

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

  // One drag session spans both panes: an entry picked up in the journal is
  // dropped on a slot in the agenda.
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

  return (
    <div className="marginalia-grid">
      <Journal
        entries={entries}
        addEntry={addEntry}
        toggleEntryDone={toggleEntryDone}
        deleteEntry={deleteEntry}
        updateEntry={updateEntry}
        draggingEntryId={drag?.payload?.kind === "entry" ? drag.payload.entry.id : null}
        onStartDrag={startEntryDrag}
        onSchedule={setPickerEntry}
      />
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
      />
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
    </div>
  );
}
