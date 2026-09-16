// Swipe thresholds, kept out of the component so the decision is testable
// and the same on every row.

export const SWIPE_THRESHOLD_PX = 72;
export const SWIPE_MAX_PX = 120;
// Past this much vertical movement the gesture is a scroll, not a swipe.
export const SWIPE_SLOPE = 1;

export function isSwipe(dx, dy) {
  return Math.abs(dx) > Math.abs(dy) * SWIPE_SLOPE;
}

// Right reveals completion, left reveals delete — the same direction as the
// action's colour and label, so a half-swipe reads as a preview.
export function swipeIntent(dx) {
  if (dx >= SWIPE_THRESHOLD_PX) return "complete";
  if (dx <= -SWIPE_THRESHOLD_PX) return "delete";
  return null;
}

export function clampSwipe(dx) {
  return Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx));
}
