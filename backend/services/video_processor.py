"""Background video analysis jobs with progress updates."""

from __future__ import annotations

from services.job_store import complete_job, fail_job, update_job
from services.motion_analyzer import MotionPoint, compute_motion_series
from services.roi import AnalysisRoi, clamp_roi_to_frame
from services.segment_detection_settings import (
    DEFAULT_SEGMENT_DETECTION_SETTINGS,
    SegmentDetectionSettings,
)
from services.segment_detector import SegmentDetectionResult, detect_segments
from services.segment_settings_schema import segment_settings_to_dict
from services.video_metadata import extract_video_metadata

SAMPLE_INTERVAL_SECONDS = 0.5


def _build_result(
    video_id: str,
    suffix: str,
    metadata,
    detection: SegmentDetectionResult,
    segment_settings: SegmentDetectionSettings,
    roi: AnalysisRoi | None = None,
) -> dict:
    result: dict = {
        "video_id": video_id,
        "video_url": f"/api/videos/{video_id}{suffix}",
        "metadata": {
            "duration_seconds": round(metadata.duration_seconds, 3),
            "fps": round(metadata.fps, 3),
            "width": metadata.width,
            "height": metadata.height,
            "sampled_fps": round(metadata.sampled_fps, 3),
        },
        "motion_samples": [
            {
                "time": sample.time,
                "motion_score": sample.motion_score,
                "smoothed_motion_score": sample.smoothed_motion_score,
                "predicted_label": sample.predicted_label,
            }
            for sample in detection.samples
        ],
        "segments": [
            {
                "start_time": segment.start_time,
                "end_time": segment.end_time,
                "label": segment.label,
            }
            for segment in detection.segments
        ],
        "segment_settings": segment_settings_to_dict(segment_settings),
    }
    if roi is not None:
        result["roi"] = roi.to_dict()
    return result


def process_video_job(
    job_id: str,
    video_path: str,
    video_id: str,
    suffix: str,
    roi: AnalysisRoi | None = None,
    segment_settings: SegmentDetectionSettings | None = None,
) -> None:
    """
    Run analysis in a background task. Updates job progress; never raises.
    """
    path = str(video_path)

    def set_progress(progress: int, message: str, status: str = "processing") -> None:
        update_job(
            job_id,
            status=status,
            progress=progress,
            message=message,
        )

    try:
        set_progress(5, "Starting analysis.")

        set_progress(15, "Reading video metadata.")
        metadata = extract_video_metadata(
            path,
            sample_interval_seconds=SAMPLE_INTERVAL_SECONDS,
        )

        set_progress(30, "Sampling frames.")

        duration = metadata.duration_seconds
        estimated_samples = max(
            1,
            int(duration / SAMPLE_INTERVAL_SECONDS) + 1 if duration > 0 else 1,
        )

        def on_motion_progress(sample_index: int, total_estimate: int) -> None:
            # Map motion sampling roughly to 30–85% (frames + scores + segments prep)
            fraction = min(1.0, sample_index / total_estimate)
            progress = 30 + int(55 * fraction)
            if progress < 60:
                message = "Computing motion scores..."
            else:
                message = "Detecting segments..."
            set_progress(progress, message)

        set_progress(60, "Computing motion scores.")
        motion_series = compute_motion_series(
            path,
            sample_interval_seconds=SAMPLE_INTERVAL_SECONDS,
            on_sample_progress=lambda i: on_motion_progress(i, estimated_samples),
            roi=roi,
        )

        set_progress(85, "Detecting segments.")
        effective_segment_settings = (
            segment_settings or DEFAULT_SEGMENT_DETECTION_SETTINGS
        )
        detection = detect_segments(motion_series, settings=effective_segment_settings)

        effective_roi = roi
        if roi is not None and metadata.width > 0 and metadata.height > 0:
            effective_roi = clamp_roi_to_frame(
                roi, metadata.width, metadata.height
            )

        result = _build_result(
            video_id,
            suffix,
            metadata,
            detection,
            effective_segment_settings,
            roi=effective_roi,
        )
        complete_job(job_id, result)
    except Exception as exc:
        fail_job(job_id, str(exc))


def run_sync_analysis(
    upload_path: str,
    video_id: str,
    suffix: str,
) -> dict:
    """Synchronous analysis used by the legacy /api/analyze endpoint."""
    metadata = extract_video_metadata(
        upload_path,
        sample_interval_seconds=SAMPLE_INTERVAL_SECONDS,
    )
    motion_series = compute_motion_series(
        upload_path,
        sample_interval_seconds=SAMPLE_INTERVAL_SECONDS,
    )
    segment_settings = DEFAULT_SEGMENT_DETECTION_SETTINGS
    detection = detect_segments(motion_series, settings=segment_settings)
    built = _build_result(video_id, suffix, metadata, detection, segment_settings)
    # Legacy camelCase response shape
    return {
        "videoId": built["video_id"],
        "videoUrl": built["video_url"],
        "metadata": {
            "durationSeconds": built["metadata"]["duration_seconds"],
            "fps": built["metadata"]["fps"],
            "width": built["metadata"]["width"],
            "height": built["metadata"]["height"],
            "sampledFps": built["metadata"]["sampled_fps"],
        },
        "motionSeries": [
            {"time": s["time"], "motionScore": s["motion_score"]}
            for s in built["motion_samples"]
        ],
        "predictedSegments": [
            {
                "startTime": seg["start_time"],
                "endTime": seg["end_time"],
                "label": seg["label"],
            }
            for seg in built["segments"]
        ],
    }
