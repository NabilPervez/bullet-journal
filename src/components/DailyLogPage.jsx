import { Journal } from "../components/Journal";
import { DayAgenda } from "../components/DayAgenda";

export function DailyLogPage(props) {
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
        setDragEntryId={setDragEntryId}
      />
    </div>
  );
}
