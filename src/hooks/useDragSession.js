import { useCallback, useEffect, useRef, useState } from "react";

// Pointer-based dragging, replacing the HTML5 drag-and-drop API — which
// mobile browsers never fire, so scheduling was mouse-only in an app built to
// be installed on a phone.
//
// Drop targets identify themselves in the DOM with data-slot-index and
// data-slot-date, and the pointer position is hit-tested against them on each
// move. That keeps this hook unaware of the agenda's layout.

const ACTIVATE_PX = 5;

function slotUnder(x, y) {
  const el = document.elementFromPoint(x, y);
  const slot = el?.closest?.("[data-slot-index]");
  if (!slot) return null;
  return { index: Number(slot.dataset.slotIndex), date: slot.dataset.slotDate };
}

export function useDragSession(onDrop) {
  const [drag, setDrag] = useState(null);
  const session = useRef(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const finish = useCallback((commit) => {
    const s = session.current;
    session.current = null;
    setDrag(null);
    if (!s) return;
    document.body.classList.remove("is-dragging");
    if (commit && s.active && s.slot) {
      onDropRef.current({ payload: s.payload, date: s.slot.date, slotIndex: s.slot.index });
    }
  }, []);

  useEffect(() => {
    function handleMove(event) {
      const s = session.current;
      if (!s || event.pointerId !== s.pointerId) return;

      if (!s.active) {
        const moved = Math.hypot(event.clientX - s.startX, event.clientY - s.startY);
        if (moved < ACTIVATE_PX) return;
        s.active = true;
        document.body.classList.add("is-dragging");
      }

      // Stops the page from panning under the finger mid-drag.
      if (event.cancelable) event.preventDefault();

      s.slot = slotUnder(event.clientX, event.clientY);
      setDrag({ payload: s.payload, label: s.label, x: event.clientX, y: event.clientY, slot: s.slot });
    }

    function handleUp(event) {
      const s = session.current;
      if (!s || event.pointerId !== s.pointerId) return;
      finish(true);
    }

    function handleCancel() {
      finish(false);
    }

    function handleKey(event) {
      if (event.key === "Escape") finish(false);
    }

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      window.removeEventListener("keydown", handleKey);
    };
  }, [finish]);

  // Called from a drag handle's onPointerDown. The handle carries
  // touch-action: none so the browser hands us the gesture instead of
  // scrolling with it; the rest of the row still scrolls normally.
  const startDrag = useCallback((event, payload, label) => {
    if (event.button != null && event.button !== 0) return;
    session.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      payload,
      label,
      active: false,
      slot: null,
    };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Capture is an optimisation; the window listeners drive the drag.
    }
  }, []);

  return { drag, startDrag };
}
