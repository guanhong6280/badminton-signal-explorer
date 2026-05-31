from dataclasses import dataclass
from typing import Callable

from services.frame_sampler import sample_frames
from services.roi import Roi


@dataclass
class MotionPoint:
    time: float
    motion_score: float


def compute_motion_series(
    video_path: str,
    sample_interval_seconds: float = 0.5,
    resize_width: int = 320,
    on_sample_progress: Callable[[int], None] | None = None,
    roi: Roi | None = None,
) -> list[MotionPoint]:
    """
    Compare consecutive sampled grayscale frames and return a normalized
    motion score per timestamp (0 = no change, 1 = max change in clip).
    """
    raw_scores: list[tuple[float, float]] = []
    previous_frame = None
    sample_index = 0

    for timestamp, frame in sample_frames(
        video_path,
        sample_interval_seconds=sample_interval_seconds,
        resize_width=resize_width,
        roi=roi,
    ):
        if previous_frame is None:
            previous_frame = frame
            raw_scores.append((timestamp, 0.0))
        else:
            diff = abs(frame.astype("float32") - previous_frame.astype("float32"))
            raw_score = float(diff.mean())
            raw_scores.append((timestamp, raw_score))
            previous_frame = frame

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
