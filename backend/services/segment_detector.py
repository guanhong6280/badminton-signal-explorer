"""Segment Detector V2: smooth motion signal, hysteresis labels, duration rules."""

from __future__ import annotations

import statistics
from dataclasses import dataclass

from services.motion_analyzer import MotionPoint
from services.segment_detection_settings import (
    DEFAULT_SEGMENT_DETECTION_SETTINGS,
    SegmentDetectionSettings,
)

Label = str  # "active" | "dead"


@dataclass
class PredictedSegment:
    start_time: float
    end_time: float
    label: Label


@dataclass
class EnrichedMotionSample:
    time: float
    motion_score: float
    smoothed_motion_score: float
    predicted_label: Label


@dataclass
class SegmentDetectionResult:
    """Per-sample debug fields plus contiguous active/dead intervals."""

    samples: list[EnrichedMotionSample]
    segments: list[PredictedSegment]


def detect_segments(
    motion_series: list[MotionPoint],
    settings: SegmentDetectionSettings | None = None,
) -> SegmentDetectionResult:
    """
    Derive active/dead intervals from normalized motion scores.

    Pipeline: moving median → hysteresis labels → segment rules → sample labels.
    """
    cfg = settings or DEFAULT_SEGMENT_DETECTION_SETTINGS

    if not motion_series:
        return SegmentDetectionResult(samples=[], segments=[])

    times = [point.time for point in motion_series]
    raw_scores = [point.motion_score for point in motion_series]
    smoothed = _moving_median(raw_scores, cfg.smoothing_window_samples)
    hysteresis_labels = _hysteresis_labels(smoothed, cfg)
    segments = _labels_to_segments(times, hysteresis_labels)
    segments = _remove_short_segments(segments, cfg)
    segments = _merge_nearby_dead_segments(segments, cfg.merge_gap_seconds)
    final_labels = _segments_to_point_labels(times, segments)

    samples = [
        EnrichedMotionSample(
            time=times[i],
            motion_score=raw_scores[i],
            smoothed_motion_score=round(smoothed[i], 4),
            predicted_label=final_labels[i],
        )
        for i in range(len(times))
    ]
    return SegmentDetectionResult(samples=samples, segments=segments)


def _moving_median(values: list[float], window: int) -> list[float]:
    """
    Centered moving median per sample.

    Median filtering dampens single-frame spikes (shuttle blur, exposure flicker)
    without lagging as much as a wide moving average.
    """
    if not values:
        return []
    if window <= 1:
        return list(values)

    half = window // 2
    smoothed: list[float] = []
    for i in range(len(values)):
        start = max(0, i - half)
        end = min(len(values), i + half + 1)
        smoothed.append(statistics.median(values[start:end]))
    return smoothed


def _hysteresis_labels(
    smoothed_scores: list[float],
    cfg: SegmentDetectionSettings,
) -> list[Label]:
    """
    Two-threshold hysteresis avoids label chatter around one cutoff.

    While active, score must fall below dead_enter_threshold to flip dead.
    While dead, score must rise above active_enter_threshold to flip active.
    The band between thresholds keeps the current state stable.
    """
    if not smoothed_scores:
        return []

    labels: list[Label] = []
    state: Label = (
        "active" if smoothed_scores[0] >= cfg.active_enter_threshold else "dead"
    )

    for score in smoothed_scores:
        if state == "active":
            if score < cfg.dead_enter_threshold:
                state = "dead"
        elif score > cfg.active_enter_threshold:
            state = "active"
        labels.append(state)
    return labels


def _labels_to_segments(times: list[float], labels: list[Label]) -> list[PredictedSegment]:
    if not times or not labels:
        return []

    segments: list[PredictedSegment] = []
    run_start = times[0]
    current = labels[0]

    for i in range(1, len(labels)):
        if labels[i] != current:
            segments.append(
                PredictedSegment(
                    start_time=run_start,
                    end_time=times[i - 1],
                    label=current,
                )
            )
            run_start = times[i]
            current = labels[i]

    segments.append(
        PredictedSegment(start_time=run_start, end_time=times[-1], label=current)
    )
    return segments


def _segment_duration(segment: PredictedSegment) -> float:
    return max(0.0, segment.end_time - segment.start_time)


def _remove_short_segments(
    segments: list[PredictedSegment],
    cfg: SegmentDetectionSettings,
) -> list[PredictedSegment]:
    """
    Drop intervals shorter than configured minimums.

    Brief dead gaps are often players walking; brief active blips are noise.
    Relabel short runs to the neighbor label, then merge adjacent same-label runs.
    """
    if not segments:
        return []

    relabeled: list[PredictedSegment] = []
    for index, segment in enumerate(segments):
        min_duration = (
            cfg.min_dead_duration_seconds
            if segment.label == "dead"
            else cfg.min_active_duration_seconds
        )
        if _segment_duration(segment) >= min_duration:
            relabeled.append(segment)
            continue

        if index > 0:
            neighbor_label = relabeled[-1].label
        elif index + 1 < len(segments):
            neighbor_label = segments[index + 1].label
        else:
            neighbor_label = "active"

        relabeled.append(
            PredictedSegment(
                start_time=segment.start_time,
                end_time=segment.end_time,
                label=neighbor_label,
            )
        )

    return _merge_adjacent_segments(relabeled)


def _merge_nearby_dead_segments(
    segments: list[PredictedSegment],
    merge_gap_seconds: float,
) -> list[PredictedSegment]:
    """
    Join dead stretches separated by a short active bridge.

    If players pause only briefly between rallies, treat the gap as dead time.
    """
    if len(segments) < 3:
        return segments

    merged: list[PredictedSegment] = [segments[0]]
    index = 1
    while index < len(segments):
        left = merged[-1]
        middle = segments[index]
        if (
            index + 1 < len(segments)
            and left.label == "dead"
            and middle.label == "active"
            and segments[index + 1].label == "dead"
            and _segment_duration(middle) < merge_gap_seconds
        ):
            right = segments[index + 1]
            merged[-1] = PredictedSegment(
                start_time=left.start_time,
                end_time=right.end_time,
                label="dead",
            )
            index += 2
            continue

        merged.append(middle)
        index += 1

    return merged


def _merge_adjacent_segments(segments: list[PredictedSegment]) -> list[PredictedSegment]:
    if not segments:
        return []

    merged: list[PredictedSegment] = [segments[0]]
    for segment in segments[1:]:
        prev = merged[-1]
        if segment.label == prev.label:
            merged[-1] = PredictedSegment(
                start_time=prev.start_time,
                end_time=segment.end_time,
                label=prev.label,
            )
        else:
            merged.append(segment)
    return merged


def _segments_to_point_labels(times: list[float], segments: list[PredictedSegment]) -> list[Label]:
    if not segments:
        return ["dead"] * len(times)

    labels: list[Label] = []
    seg_index = 0
    for time in times:
        while seg_index < len(segments) - 1 and time > segments[seg_index].end_time:
            seg_index += 1
        labels.append(segments[seg_index].label)
    return labels
