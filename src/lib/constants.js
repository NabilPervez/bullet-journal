export const START_HOUR = 6;
export const END_HOUR = 22;
export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
export const ROW_HEIGHT = 26;
// A finger needs more than 26px; compact screens rule the day at 44.
export const ROW_HEIGHT_COMPACT = 44;
export const DEFAULT_EVENT_DURATION = SLOT_MINUTES;
// Blocks resize in quarter hours even though the grid rules every half.
export const RESIZE_SNAP_MINUTES = 15;
