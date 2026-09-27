import { STORES } from "../lib/subtasks";

// Where a shopping list is for: one tap for the usual stores, or type any
// other. The chips and the box are the same value, so picking a chip fills
// the box and typing a known store lights its chip.
export function StorePicker({ value, onChange, idPrefix }) {
  const current = value.trim().toLowerCase();

  return (
    <div className="field">
      <label className="field-label" htmlFor={idPrefix}>Where</label>
      <div className="row gap-2 wrap" role="group" aria-label="Common stores">
        {STORES.map((store) => (
          <button
            key={store}
            type="button"
            className="chip"
            aria-pressed={current === store.toLowerCase()}
            onClick={() => onChange(current === store.toLowerCase() ? "" : store)}
          >
            {store}
          </button>
        ))}
      </div>
      <input
        id={idPrefix}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or type a store"
        autoComplete="off"
      />
    </div>
  );
}
