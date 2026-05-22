from dataclasses import dataclass

import cv2


@dataclass
class VideoMetadata:
    duration_seconds: float
    fps: float
    width: int
    height: int
    sampled_fps: float


def extract_video_metadata(
    video_path: str,
    sample_interval_seconds: float,
) -> VideoMetadata:
    """Read basic video properties from the file header."""
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    try:
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        frame_count = float(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0)
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        duration_seconds = frame_count / fps if fps > 0 else 0.0
        sampled_fps = (
            1.0 / sample_interval_seconds if sample_interval_seconds > 0 else 0.0
        )

        return VideoMetadata(
            duration_seconds=duration_seconds,
            fps=fps,
            width=width,
            height=height,
            sampled_fps=sampled_fps,
        )
    finally:
        capture.release()
