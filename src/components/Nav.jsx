// Four destinations. The Future Log used to have its own tab; it is a way of
// looking at what's ahead, so it lives inside the Index next to what's behind.
const NAV_ITEMS = [
  { id: "index", label: "Index", glyph: "≡" },
  { id: "monthly", label: "Month", glyph: "▦" },
  { id: "weekly", label: "Week", glyph: "▤" },
  { id: "daily", label: "Today", glyph: "•" },
];

export function Nav({ view, onChangeView }) {
  return (
    <nav aria-label="Collections" className="nav">
      <div className="nav-brand">Bullet Journal</div>
      {NAV_ITEMS.map(({ id, label, glyph }) => (
        <button
          key={id}
          onClick={() => onChangeView(id)}
          aria-current={view === id ? "page" : undefined}
          className="nav-item"
        >
          <span className="nav-glyph" aria-hidden="true">{glyph}</span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
