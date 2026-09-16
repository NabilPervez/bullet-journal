// Follows the pointer during a drag: without it, a touch drag has no visible
// subject — the finger covers the row it picked up.
export function DragGhost({ drag }) {
  if (!drag) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: drag.x,
        top: drag.y,
        transform: "translate(-50%, -150%) rotate(-3deg)",
        zIndex: 50,
        pointerEvents: "none",
        maxWidth: 240,
        padding: "10px 14px",
        borderRadius: "var(--r-md)",
        background: drag.slot ? "var(--accent)" : "var(--surface-3)",
        color: drag.slot ? "var(--on-accent)" : "var(--text)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-meta)",
        fontWeight: 700,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      {drag.label}
    </div>
  );
}
