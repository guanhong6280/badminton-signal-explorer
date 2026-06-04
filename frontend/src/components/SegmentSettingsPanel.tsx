import {
  DEFAULT_SEGMENT_DETECTION_SETTINGS,
  normalizeSmoothingWindow,
  validateSegmentSettings,
} from "../constants/segmentSettings";
import type { SegmentDetectionSettings } from "../types/analysis";

interface SegmentSettingsPanelProps {
  settings: SegmentDetectionSettings;
  onChange: (settings: SegmentDetectionSettings) => void;
  disabled?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function SegmentSettingsPanel({
  settings,
  onChange,
  disabled = false,
}: SegmentSettingsPanelProps) {
  const validationError = validateSegmentSettings(settings);

  const update = (patch: Partial<SegmentDetectionSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <section className="panel tuning-panel">
      <div className="tuning-panel-header">
        <h2>Detection settings</h2>
        <button
          type="button"
          className="tuning-reset-btn"
          disabled={disabled}
          onClick={() => onChange({ ...DEFAULT_SEGMENT_DETECTION_SETTINGS })}
        >
          Reset defaults
        </button>
      </div>
      <p className="hint">
        Tune Segment Detector V2 before analyzing. Settings are sent with each
        analysis request.
      </p>

      {validationError && (
        <p className="tuning-warning">{validationError}</p>
      )}

      <div className="tuning-grid">
        <label className="tuning-field">
          <span className="tuning-label">
            Smoothing window (samples)
            <span className="tuning-value">{settings.smoothing_window_samples}</span>
          </span>
          <input
            type="range"
            min={1}
            max={21}
            step={2}
            disabled={disabled}
            value={settings.smoothing_window_samples}
            onChange={(event) =>
              update({
                smoothing_window_samples: Number(event.target.value),
              })
            }
            onBlur={() =>
              update({
                smoothing_window_samples: normalizeSmoothingWindow(
                  settings.smoothing_window_samples,
                ),
              })
            }
          />
        </label>

        <label className="tuning-field">
          <span className="tuning-label">
            Dead enter threshold
            <span className="tuning-value">
              {settings.dead_enter_threshold.toFixed(2)}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={disabled}
            value={settings.dead_enter_threshold}
            onChange={(event) =>
              update({ dead_enter_threshold: Number(event.target.value) })
            }
          />
        </label>

        <label className="tuning-field">
          <span className="tuning-label">
            Active enter threshold
            <span className="tuning-value">
              {settings.active_enter_threshold.toFixed(2)}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={disabled}
            value={settings.active_enter_threshold}
            onChange={(event) =>
              update({ active_enter_threshold: Number(event.target.value) })
            }
          />
        </label>

        <label className="tuning-field">
          <span className="tuning-label">Min dead duration (s)</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            disabled={disabled}
            value={settings.min_dead_duration_seconds}
            onChange={(event) =>
              update({
                min_dead_duration_seconds: clamp(
                  Number(event.target.value),
                  0,
                  10,
                ),
              })
            }
          />
        </label>

        <label className="tuning-field">
          <span className="tuning-label">Min active duration (s)</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            disabled={disabled}
            value={settings.min_active_duration_seconds}
            onChange={(event) =>
              update({
                min_active_duration_seconds: clamp(
                  Number(event.target.value),
                  0,
                  10,
                ),
              })
            }
          />
        </label>

        <label className="tuning-field">
          <span className="tuning-label">Merge gap (s)</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            disabled={disabled}
            value={settings.merge_gap_seconds}
            onChange={(event) =>
              update({
                merge_gap_seconds: clamp(Number(event.target.value), 0, 10),
              })
            }
          />
        </label>
      </div>
    </section>
  );
}
