"""Region of interest (court area) for motion analysis."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal

import cv2
import numpy as np

RoiType = Literal["rectangle", "polygon"]


@dataclass(frozen=True)
class Point:
    x: int
    y: int


@dataclass(frozen=True)
class RectangleRoi:
    x: int
    y: int
    width: int
    height: int

    @property
    def roi_type(self) -> RoiType:
        return "rectangle"

    def to_dict(self) -> dict:
        return {
            "type": "rectangle",
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }


@dataclass(frozen=True)
class PolygonRoi:
    points: tuple[Point, Point, Point, Point]

    @property
    def roi_type(self) -> RoiType:
        return "polygon"

    def to_dict(self) -> dict:
        return {
            "type": "polygon",
            "points": [{"x": p.x, "y": p.y} for p in self.points],
        }


AnalysisRoi = RectangleRoi | PolygonRoi


def _parse_point(raw: object, index: int) -> Point:
    if not isinstance(raw, dict):
        raise ValueError(f"roi points[{index}] must be an object")
    if "x" not in raw or "y" not in raw:
        raise ValueError(f"roi points[{index}] must have x and y")
    try:
        x = int(raw["x"])
        y = int(raw["y"])
    except (TypeError, ValueError) as exc:
        raise ValueError(f"roi points[{index}] x and y must be integers") from exc
    return Point(x=x, y=y)


def parse_roi_json(roi_str: str | None) -> AnalysisRoi | None:
    """Parse optional ROI JSON form field. Raises ValueError on invalid input."""
    if roi_str is None or (isinstance(roi_str, str) and not roi_str.strip()):
        return None

    try:
        data = json.loads(roi_str)
    except json.JSONDecodeError as exc:
        raise ValueError("roi must be valid JSON") from exc

    if not isinstance(data, dict):
        raise ValueError("roi must be a JSON object")

    roi_type = data.get("type")
    if roi_type is None and all(k in data for k in ("x", "y", "width", "height")):
        roi_type = "rectangle"

    if roi_type == "rectangle":
        required = ("x", "y", "width", "height")
        for key in required:
            if key not in data:
                raise ValueError(f"rectangle roi missing required field: {key}")
        try:
            x = int(data["x"])
            y = int(data["y"])
            width = int(data["width"])
            height = int(data["height"])
        except (TypeError, ValueError) as exc:
            raise ValueError("rectangle roi x, y, width, and height must be integers") from exc
        if x < 0 or y < 0:
            raise ValueError("rectangle roi x and y must be >= 0")
        if width <= 0 or height <= 0:
            raise ValueError("rectangle roi width and height must be > 0")
        return RectangleRoi(x=x, y=y, width=width, height=height)

    if roi_type == "polygon":
        if "points" not in data:
            raise ValueError("polygon roi missing required field: points")
        points_raw = data["points"]
        if not isinstance(points_raw, list):
            raise ValueError("polygon roi points must be an array")
        if len(points_raw) != 4:
            raise ValueError("polygon roi must have exactly 4 points")
        points = tuple(_parse_point(points_raw[i], i) for i in range(4))
        return PolygonRoi(points=points)

    if roi_type is None:
        raise ValueError('roi must include type: "rectangle" or "polygon"')
    raise ValueError('roi type must be "rectangle" or "polygon"')


def clamp_roi_to_frame(roi: AnalysisRoi, frame_width: int, frame_height: int) -> AnalysisRoi:
    """Clamp ROI coordinates to frame bounds."""
    if isinstance(roi, RectangleRoi):
        x = max(0, min(roi.x, frame_width))
        y = max(0, min(roi.y, frame_height))
        x2 = min(x + roi.width, frame_width)
        y2 = min(y + roi.height, frame_height)
        return RectangleRoi(x=x, y=y, width=max(0, x2 - x), height=max(0, y2 - y))

    clamped = tuple(
        Point(
            x=max(0, min(p.x, frame_width)),
            y=max(0, min(p.y, frame_height)),
        )
        for p in roi.points
    )
    return PolygonRoi(points=clamped)  # type: ignore[arg-type]


def apply_rectangle_crop(frame: np.ndarray, roi: RectangleRoi) -> np.ndarray:
    """Crop BGR frame to rectangle ROI (clamped)."""
    height, width = frame.shape[:2]
    clamped = clamp_roi_to_frame(roi, width, height)
    if not isinstance(clamped, RectangleRoi) or clamped.width <= 0 or clamped.height <= 0:
        return frame
    return frame[
        clamped.y : clamped.y + clamped.height,
        clamped.x : clamped.x + clamped.width,
    ]


def create_polygon_mask(shape: tuple[int, ...], roi: PolygonRoi) -> np.ndarray:
    """Binary mask (0/255) for polygon ROI at frame height x width."""
    height, width = shape[:2]
    clamped = clamp_roi_to_frame(roi, width, height)
    if not isinstance(clamped, PolygonRoi):
        return np.zeros((height, width), dtype=np.uint8)

    pts = np.array(
        [[[p.x, p.y] for p in clamped.points]],
        dtype=np.int32,
    )
    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(mask, pts, 255)
    return mask


def resize_mask_to_frame(mask: np.ndarray, target_shape: tuple[int, int]) -> np.ndarray:
    """Resize mask to match a grayscale frame (height, width)."""
    target_h, target_w = target_shape
    if mask.shape[0] == target_h and mask.shape[1] == target_w:
        return mask
    return cv2.resize(mask, (target_w, target_h), interpolation=cv2.INTER_NEAREST)
