import type { SegmentDetectionSettings } from "../types/analysis";

export const DEFAULT_SEGMENT_DETECTION_SETTINGS: SegmentDetectionSettings = {
  smoothing_window_samples: 5,
  dead_enter_threshold: 0.4,
  active_enter_threshold: 0.6,
  min_dead_duration_seconds: 2.0,
  min_active_duration_seconds: 1.5,
  merge_gap_seconds: 1.5,
};

/** Snap even window sizes to the nearest lower odd value (min 1). */
export function normalizeSmoothingWindow(value: number): number {
  const rounded = Math.max(1, Math.round(value));
  if (rounded % 2 === 0) {
    return Math.max(1, rounded - 1);
  }
  return rounded;
}

export function validateSegmentSettings(
  settings: SegmentDetectionSettings,
): string | null {
  if (settings.active_enter_threshold <= settings.dead_enter_threshold) {
    return "Active threshold must be greater than dead threshold.";
  }
  if (
    settings.smoothing_window_samples < 1 ||
    !Number.isInteger(settings.smoothing_window_samples)
  ) {
    return "Smoothing window must be a positive integer.";
  }
  if (settings.smoothing_window_samples % 2 === 0) {
    return "Smoothing window should be an odd number.";
  }
  return null;
}

export function formatSegmentSettingsSummary(
  settings: SegmentDetectionSettings,
): string {
  return [
    `window=${settings.smoothing_window_samples}`,
    `dead≤${settings.dead_enter_threshold.toFixed(2)}`,
    `active≥${settings.active_enter_threshold.toFixed(2)}`,
    `min dead=${settings.min_dead_duration_seconds}s`,
    `min active=${settings.min_active_duration_seconds}s`,
    `merge=${settings.merge_gap_seconds}s`,
  ].join(", ");
}
