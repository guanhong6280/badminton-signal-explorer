"""Parse and validate segment_settings JSON from analyze requests."""

from __future__ import annotations

import json

from pydantic import BaseModel, Field, ValidationError, model_validator

from services.segment_detection_settings import (
    DEFAULT_SEGMENT_DETECTION_SETTINGS,
    SegmentDetectionSettings,
)


class SegmentSettingsPayload(BaseModel):
    smoothing_window_samples: int = Field(default=5, ge=1)
    dead_enter_threshold: float = Field(default=0.40, ge=0.0, le=1.0)
    active_enter_threshold: float = Field(default=0.60, ge=0.0, le=1.0)
    min_dead_duration_seconds: float = Field(default=2.0, ge=0.0)
    min_active_duration_seconds: float = Field(default=1.5, ge=0.0)
    merge_gap_seconds: float = Field(default=1.5, ge=0.0)

    @model_validator(mode="after")
    def validate_thresholds_and_window(self) -> SegmentSettingsPayload:
        if self.active_enter_threshold <= self.dead_enter_threshold:
            raise ValueError(
                "active_enter_threshold must be greater than dead_enter_threshold"
            )
        if self.smoothing_window_samples % 2 == 0:
            raise ValueError(
                "smoothing_window_samples must be an odd positive integer"
            )
        return self

    def to_settings(self) -> SegmentDetectionSettings:
        return SegmentDetectionSettings(
            smoothing_window_samples=self.smoothing_window_samples,
            dead_enter_threshold=self.dead_enter_threshold,
            active_enter_threshold=self.active_enter_threshold,
            min_dead_duration_seconds=self.min_dead_duration_seconds,
            min_active_duration_seconds=self.min_active_duration_seconds,
            merge_gap_seconds=self.merge_gap_seconds,
        )


def segment_settings_to_dict(settings: SegmentDetectionSettings) -> dict:
    return {
        "smoothing_window_samples": settings.smoothing_window_samples,
        "dead_enter_threshold": settings.dead_enter_threshold,
        "active_enter_threshold": settings.active_enter_threshold,
        "min_dead_duration_seconds": settings.min_dead_duration_seconds,
        "min_active_duration_seconds": settings.min_active_duration_seconds,
        "merge_gap_seconds": settings.merge_gap_seconds,
    }


def parse_segment_settings_json(
    settings_str: str | None,
) -> SegmentDetectionSettings:
    """
    Parse optional segment_settings form field.

    Returns defaults when omitted or blank. Raises ValueError with a clear
    message when JSON or field values are invalid.
    """
    if settings_str is None or not settings_str.strip():
        return DEFAULT_SEGMENT_DETECTION_SETTINGS

    try:
        data = json.loads(settings_str)
    except json.JSONDecodeError as exc:
        raise ValueError(f"segment_settings must be valid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise ValueError("segment_settings must be a JSON object")

    try:
        payload = SegmentSettingsPayload.model_validate(data)
    except ValidationError as exc:
        messages = "; ".join(
            f"{'.'.join(str(part) for part in err['loc'])}: {err['msg']}"
            for err in exc.errors()
        )
        raise ValueError(f"Invalid segment_settings: {messages}") from exc

    return payload.to_settings()
