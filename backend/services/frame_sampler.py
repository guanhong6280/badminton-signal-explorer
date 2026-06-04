from typing import Iterator

import cv2
import numpy as np

from services.roi import (
    AnalysisRoi,
    PolygonRoi,
    RectangleRoi,
    apply_rectangle_crop,
    create_polygon_mask,
    resize_mask_to_frame,
)


def sample_frames(
    video_path: str,
    sample_interval_seconds: float,
    resize_width: int = 320,
    roi: AnalysisRoi | None = None,
) -> Iterator[tuple[float, np.ndarray, np.ndarray | None]]:
    """
    Yield (timestamp_seconds, grayscale_frame, optional_mask) at a fixed interval.
    Mask is 0/255, same size as grayscale, only for polygon ROI.
    """
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    try:
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        if fps <= 0:
            raise ValueError("Video has invalid FPS")

        frame_index = 0
        next_sample_time = 0.0

        while True:
            success, frame = capture.read()
            if not success:
                break

            timestamp = frame_index / fps
            if timestamp + 1e-9 >= next_sample_time:
                mask: np.ndarray | None = None

                if roi is None:
                    gray = _to_resized_grayscale(frame, resize_width)
                elif isinstance(roi, RectangleRoi):
                    cropped = apply_rectangle_crop(frame, roi)
                    gray = _to_resized_grayscale(cropped, resize_width)
                else:
                    gray = _to_resized_grayscale(frame, resize_width)
                    full_mask = create_polygon_mask(frame.shape, roi)
                    mask = resize_mask_to_frame(full_mask, gray.shape)

                yield timestamp, gray, mask
                next_sample_time += sample_interval_seconds

            frame_index += 1
    finally:
        capture.release()


def _to_resized_grayscale(frame: np.ndarray, resize_width: int) -> np.ndarray:
    height, width = frame.shape[:2]
    if width <= 0 or height <= 0:
        raise ValueError("Invalid frame dimensions")

    scale = resize_width / width
    resize_height = max(1, int(height * scale))
    resized = cv2.resize(frame, (resize_width, resize_height))
    return cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
