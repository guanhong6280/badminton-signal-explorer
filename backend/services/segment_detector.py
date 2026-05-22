from dataclasses import dataclass

from services.motion_analyzer import MotionPoint


@dataclass
class PredictedSegment:
    start_time: float
    end_time: float
    label: str


def detect_segments(
    motion_series: list[MotionPoint],
    motion_threshold: float = 0.25,
) -> list[PredictedSegment]:
    """
    Placeholder for active/dead interval detection from motion scores.
    Returns empty list until thresholding and smoothing are implemented.
    """
    _ = motion_threshold
    return []
