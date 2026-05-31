"""Region of interest (court area) for motion analysis."""

from __future__ import annotations

import json
from dataclasses import dataclass
import numpy as np


@dataclass(frozen=True)
class Roi:
    x: int
    y: int
    width: int
    height: int

    def to_dict(self) -> dict[str, int]:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }


def parse_roi_json(roi_str: str | None) -> Roi | None:
    """Parse optional ROI JSON form field. Raises ValueError on invalid input."""
    if roi_str is None or (isinstance(roi_str, str) and not roi_str.strip()):
        return None

    try:
        data = json.loads(roi_str)
    except json.JSONDecodeError as exc:
        raise ValueError("roi must be valid JSON") from exc

    if not isinstance(data, dict):
        raise ValueError("roi must be a JSON object")

    required = ("x", "y", "width", "height")
    for key in required:
        if key not in data:
            raise ValueError(f"roi missing required field: {key}")

    try:
        x = int(data["x"])
        y = int(data["y"])
        width = int(data["width"])
        height = int(data["height"])
    except (TypeError, ValueError) as exc:
        raise ValueError("roi x, y, width, and height must be integers") from exc

    if x < 0 or y < 0:
        raise ValueError("roi x and y must be >= 0")
    if width <= 0 or height <= 0:
        raise ValueError("roi width and height must be > 0")

    return Roi(x=x, y=y, width=width, height=height)


def clamp_roi_to_frame(roi: Roi, frame_width: int, frame_height: int) -> Roi:
    """Clamp ROI to frame bounds; returns effective crop region."""
    x = max(0, min(roi.x, frame_width))
    y = max(0, min(roi.y, frame_height))
    x2 = min(x + roi.width, frame_width)
    y2 = min(y + roi.height, frame_height)
    return Roi(x=x, y=y, width=max(0, x2 - x), height=max(0, y2 - y))


def apply_roi_to_frame(frame: np.ndarray, roi: Roi | None) -> np.ndarray:
    """Crop BGR frame to ROI (clamped). No-op if roi is None."""
    if roi is None:
        return frame

    height, width = frame.shape[:2]
    clamped = clamp_roi_to_frame(roi, width, height)
    if clamped.width <= 0 or clamped.height <= 0:
        return frame

    return frame[
        clamped.y : clamped.y + clamped.height,
        clamped.x : clamped.x + clamped.width,
    ]
