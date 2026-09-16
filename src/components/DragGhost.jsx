import { C, fontMono } from "../theme";

// Follows the pointer during a drag. Without it a touch drag has no visible
// subject at all — the finger covers the row it picked up.
export function DragGhost({ drag }) {
  if (!drag) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: drag.x,
        top: drag.y,
        transform: "translate(-50%, -140%)",
        zIndex: 50,
        pointerEvents: "none",
        maxWidth: 220,
        padding: "6px 10px",
        borderRadius: 8,
        background: drag.slot ? C.accent : C.inkSoft,
        color: C.paper,
        fontFamily: fontMono,
        fontSize: 12,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
      }}
    >
      {drag.label}
    </div>
  );
}
