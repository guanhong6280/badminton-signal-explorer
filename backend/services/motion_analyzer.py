from dataclasses import dataclass
from typing import Callable

import numpy as np

from services.frame_sampler import sample_frames
from services.roi import AnalysisRoi


@dataclass
class MotionPoint:
    time: float
    motion_score: float


def _masked_mean_diff(
    current: np.ndarray,
    previous: np.ndarray,
    mask: np.ndarray,
) -> float:
    """Mean absolute diff only where mask > 0 (both frames compared in masked region)."""
    valid = mask > 0
    if not np.any(valid):
        return 0.0
    diff = np.abs(current.astype("float32") - previous.astype("float32"))
    return float(diff[valid].mean())


def compute_motion_series(
    video_path: str,
    sample_interval_seconds: float = 0.5,
    resize_width: int = 320,
    on_sample_progress: Callable[[int], None] | None = None,
    roi: AnalysisRoi | None = None,
) -> list[MotionPoint]:
    """
    Compare consecutive sampled grayscale frames and return a normalized
    motion score per timestamp (0 = no change, 1 = max change in clip).
    """
    raw_scores: list[tuple[float, float]] = []
    previous_frame: np.ndarray | None = None
    previous_mask: np.ndarray | None = None
    sample_index = 0

    for timestamp, frame, mask in sample_frames(
        video_path,
        sample_interval_seconds=sample_interval_seconds,
        resize_width=resize_width,
        roi=roi,
    ):
        if previous_frame is None:
            previous_frame = frame
            previous_mask = mask
            raw_scores.append((timestamp, 0.0))
        else:
            if mask is not None and previous_mask is not None:
                combined = np.minimum(mask, previous_mask)
                raw_score = _masked_mean_diff(frame, previous_frame, combined)
            else:
                diff = np.abs(frame.astype("float32") - previous_frame.astype("float32"))
                raw_score = float(diff.mean())
            raw_scores.append((timestamp, raw_score))
            previous_frame = frame
            previous_mask = mask

        if on_sample_progress is not None:
            on_sample_progress(sample_index)
        sample_index += 1

    if not raw_scores:
        return []

    max_score = max(score for _, score in raw_scores)
    if max_score <= 0:
        return [MotionPoint(time=t, motion_score=0.0) for t, _ in raw_scores]

    return [
        MotionPoint(time=t, motion_score=round(score / max_score, 4))
        for t, score in raw_scores
    ]
