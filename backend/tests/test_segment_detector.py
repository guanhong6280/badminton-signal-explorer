"""Unit tests for Segment Detector V2."""

from services.motion_analyzer import MotionPoint
from services.segment_detection_settings import SegmentDetectionSettings
from services.segment_detector import detect_segments


def _series(scores: list[float], step: float = 0.5) -> list[MotionPoint]:
    return [MotionPoint(time=i * step, motion_score=s) for i, s in enumerate(scores)]


def test_empty_series():
    result = detect_segments([])
    assert result.samples == []
    assert result.segments == []


def test_hysteresis_prevents_rapid_flipping():
    # Oscillate in the dead band (0.45–0.55); should stay dead after starting dead.
    cfg = SegmentDetectionSettings(
        smoothing_window_samples=1,
        min_dead_duration_seconds=0.0,
        min_active_duration_seconds=0.0,
        merge_gap_seconds=0.0,
    )
    scores = [0.2, 0.55, 0.45, 0.55, 0.45, 0.8, 0.8, 0.8]
    result = detect_segments(_series(scores), settings=cfg)
    mid_labels = [s.predicted_label for s in result.samples[1:5]]
    assert all(label == "dead" for label in mid_labels)
    assert result.samples[-1].predicted_label == "active"


def test_short_dead_segment_removed():
    cfg = SegmentDetectionSettings(
        smoothing_window_samples=1,
        dead_enter_threshold=0.4,
        active_enter_threshold=0.6,
        min_dead_duration_seconds=2.0,
        min_active_duration_seconds=0.5,
        merge_gap_seconds=10.0,
    )
    # dead 1s, active 4s, dead 4s → middle dead (1 sample at t=0) should vanish
    scores = [0.1, 0.9, 0.9, 0.9, 0.9, 0.1, 0.1, 0.1, 0.1]
    result = detect_segments(_series(scores), settings=cfg)
    dead_segments = [s for s in result.segments if s.label == "dead"]
    assert not any(seg.end_time - seg.start_time < 2.0 for seg in dead_segments)


def test_merge_nearby_dead_segments():
    cfg = SegmentDetectionSettings(
        smoothing_window_samples=1,
        dead_enter_threshold=0.35,
        active_enter_threshold=0.65,
        min_dead_duration_seconds=0.5,
        min_active_duration_seconds=0.5,
        merge_gap_seconds=1.5,
    )
    # dead, brief active (1s), dead → one dead segment after merge
    scores = (
        [0.1] * 4
        + [0.9, 0.9]
        + [0.1] * 4
    )
    result = detect_segments(_series(scores), settings=cfg)
    dead_segments = [s for s in result.segments if s.label == "dead"]
    assert len(dead_segments) == 1


def test_motion_samples_include_debug_fields():
    result = detect_segments(_series([0.1, 0.9, 0.9, 0.1]))
    sample = result.samples[0]
    assert sample.motion_score == 0.1
    assert 0.0 <= sample.smoothed_motion_score <= 1.0
    assert sample.predicted_label in ("active", "dead")
