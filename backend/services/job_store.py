"""In-memory job store for async video analysis (local dev only)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

JobStatus = Literal["queued", "processing", "completed", "failed"]

_jobs: dict[str, dict[str, Any]] = {}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_job() -> dict[str, Any]:
    job_id = str(uuid4())
    now = _utc_now_iso()
    job: dict[str, Any] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "message": "Video uploaded. Analysis queued.",
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
        "video_path": None,
    }
    _jobs[job_id] = job
    return job


def get_job(job_id: str) -> dict[str, Any] | None:
    return _jobs.get(job_id)


def update_job(job_id: str, **fields: Any) -> dict[str, Any] | None:
    job = _jobs.get(job_id)
    if job is None:
        return None
    job.update(fields)
    job["updated_at"] = _utc_now_iso()
    return job


def complete_job(job_id: str, result: dict[str, Any]) -> dict[str, Any] | None:
    return update_job(
        job_id,
        status="completed",
        progress=100,
        message="Analysis completed.",
        result=result,
        error=None,
    )


def fail_job(job_id: str, error: str) -> dict[str, Any] | None:
    return update_job(
        job_id,
        status="failed",
        message="Analysis failed.",
        error=error,
    )


def job_to_response(job: dict[str, Any]) -> dict[str, Any]:
    """Public API shape (excludes internal fields like video_path)."""
    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "result": job["result"],
        "error": job["error"],
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
    }
