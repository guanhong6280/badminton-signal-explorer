"""Tunable parameters for Segment Detector V2.

Adjust values here when dead/active intervals are too noisy or too sluggish.
All durations are in seconds; thresholds apply to smoothed motion scores in [0, 1].
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class SegmentDetectionSettings:
    # Moving-median window width in samples (e.g. 5 ≈ 2.5s at 0.5s sampling).
    smoothing_window_samples: int = 5
    # Hysteresis: drop from active → dead only below this smoothed score.
    dead_enter_threshold: float = 0.40
    # Hysteresis: rise from dead → active only above this smoothed score.
    active_enter_threshold: float = 0.60
    # Discard brief dead intervals (walk-throughs, pauses between points).
    min_dead_duration_seconds: float = 2.0
    # Discard brief active blips (camera shake, single noisy frames).
    min_active_duration_seconds: float = 1.5
    # Merge dead regions separated by a short active bridge.
    merge_gap_seconds: float = 1.5


DEFAULT_SEGMENT_DETECTION_SETTINGS = SegmentDetectionSettings()
