import { useState } from "react";
import { presetFor, REPEAT_PRESETS, UNITS } from "../lib/recurrence";

// Presets cover almost everything people repeat; Custom is there for the
// rest ("every 3 weeks") without making the common case a form.
export function RepeatPicker({ value, onChange, idPrefix }) {
  const current = presetFor(value);
  const [customOpen, setCustomOpen] = useState(current === "custom");
  const showCustom = customOpen || current === "custom";

  const every = value?.every ?? 2;
  const unit = value?.unit ?? "week";

  return (
    <fieldset className="stack gap-2" style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
      <legend className="field-label" style={{ padding: 0 }}>Repeat</legend>

      <div className="row gap-2 wrap">
        {REPEAT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="chip"
            aria-pressed={!showCustom && current === preset.id}
            onClick={() => {
              setCustomOpen(false);
              onChange(preset.repeat);
            }}
          >
            {preset.id !== "none" && <span aria-hidden="true">↻</span>}
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={showCustom}
          onClick={() => {
            setCustomOpen(true);
            onChange({ every, unit });
          }}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="row gap-2">
          <span className="meta">Every</span>
          <input
            id={`${idPrefix}-repeat-every`}
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={every}
            onChange={(e) => onChange({ every: Math.max(1, Number(e.target.value) || 1), unit })}
            aria-label="Repeat every"
            style={{ width: 84, flex: "0 0 auto" }}
          />
          <select
            id={`${idPrefix}-repeat-unit`}
            className="input grow"
            value={unit}
            onChange={(e) => onChange({ every, unit: e.target.value })}
            aria-label="Repeat unit"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {every === 1 ? u : `${u}s`}
              </option>
            ))}
          </select>
        </div>
      )}
    </fieldset>
  );
}
