// Four destinations. What's ahead leads, with the index of what has already
// been logged behind it on the same screen.
const NAV_ITEMS = [
  { id: "index", label: "Future", glyph: "→" },
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
