import { useRef, useState } from "react";
import { clampSwipe, isSwipe, swipeIntent } from "../lib/gestures";

// Swipe right to complete, left to delete. The row carries touch-action:
// pan-y, so a vertical drag still scrolls the list and only a horizontal one
// reaches us.
export function useSwipeActions({ onComplete, onDelete, enabled = true }) {
  const [offset, setOffset] = useState(0);
  const state = useRef(null);

  function buzz() {
    // Confirmation you can feel, for an action taken without looking.
    navigator.vibrate?.(10);
  }

  function reset() {
    state.current = null;
    setOffset(0);
  }

  const handlers = !enabled
    ? {}
    : {
        onPointerDown(event) {
          if (event.pointerType === "mouse") return;
          state.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false };
        },
        onPointerMove(event) {
          const s = state.current;
          if (!s || event.pointerId !== s.pointerId) return;
          const dx = event.clientX - s.startX;
          const dy = event.clientY - s.startY;

          if (!s.active) {
            if (Math.abs(dx) < 8) return;
            if (!isSwipe(dx, dy)) {
              state.current = null;
              return;
            }
            s.active = true;
            try {
              event.currentTarget.setPointerCapture?.(event.pointerId);
            } catch {
              // Pointer already released; the window listeners still finish the gesture.
            }
          }
          setOffset(clampSwipe(dx));
        },
        onPointerUp(event) {
          const s = state.current;
          if (!s || event.pointerId !== s.pointerId) return;
          const intent = s.active ? swipeIntent(event.clientX - s.startX) : null;
          reset();
          if (intent === "complete") {
            buzz();
            onComplete();
          }
          if (intent === "delete") {
            buzz();
            onDelete();
          }
        },
        onPointerCancel: reset,
      };

  return { offset, swiping: offset !== 0, handlers };
}
