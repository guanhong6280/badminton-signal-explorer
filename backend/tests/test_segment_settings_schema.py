"""Tests for segment_settings JSON parsing."""

import pytest

from services.segment_detection_settings import DEFAULT_SEGMENT_DETECTION_SETTINGS
from services.segment_settings_schema import parse_segment_settings_json


def test_defaults_when_omitted():
    settings = parse_segment_settings_json(None)
    assert settings == DEFAULT_SEGMENT_DETECTION_SETTINGS


def test_valid_custom_settings():
    settings = parse_segment_settings_json(
        '{"smoothing_window_samples": 7, "dead_enter_threshold": 0.3, '
        '"active_enter_threshold": 0.7, "min_dead_duration_seconds": 1.0, '
        '"min_active_duration_seconds": 1.0, "merge_gap_seconds": 2.0}'
    )
    assert settings.smoothing_window_samples == 7
    assert settings.dead_enter_threshold == 0.3
    assert settings.active_enter_threshold == 0.7


def test_rejects_even_smoothing_window():
    with pytest.raises(ValueError, match="odd"):
        parse_segment_settings_json('{"smoothing_window_samples": 4}')


def test_rejects_active_not_above_dead():
    with pytest.raises(ValueError, match="active_enter_threshold"):
        parse_segment_settings_json(
            '{"dead_enter_threshold": 0.6, "active_enter_threshold": 0.4}'
        )


def test_rejects_invalid_json():
    with pytest.raises(ValueError, match="valid JSON"):
        parse_segment_settings_json("{not json")
