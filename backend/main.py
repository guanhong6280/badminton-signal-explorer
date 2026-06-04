import shutil
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from services.job_store import create_job, get_job, job_to_response, update_job
from services.roi import parse_roi_json
from services.segment_settings_schema import (
    parse_segment_settings_json,
    segment_settings_to_dict,
)
from services.video_processor import process_video_job, run_sync_analysis

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Badminton Signal Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _save_upload(file: UploadFile) -> tuple[str, Path, str]:
    """Return (video_id, upload_path, suffix)."""
    video_id = str(uuid.uuid4())
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    upload_path = UPLOAD_DIR / f"{video_id}{suffix}"
    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return video_id, upload_path, suffix


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/videos/analyze")
async def analyze_video_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    roi: str | None = Form(None),
    segment_settings: str | None = Form(None),
) -> dict:
    """
    Upload a video and start analysis in the background.
    Poll GET /api/videos/jobs/{job_id} for progress and the final result.

    Optional form field ``roi``: JSON string in original video pixel coordinates.
    Optional form field ``segment_settings``: JSON object for Segment Detector V2.
    """
    try:
        parsed_roi = parse_roi_json(roi)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        parsed_segment_settings = parse_segment_settings_json(segment_settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    video_id, upload_path, suffix = _save_upload(file)

    job = create_job()
    job_id = job["job_id"]
    update_job(
        job_id,
        video_path=str(upload_path),
        roi=parsed_roi.to_dict() if parsed_roi else None,
        segment_settings=segment_settings_to_dict(parsed_segment_settings),
    )

    background_tasks.add_task(
        process_video_job,
        job_id,
        str(upload_path),
        video_id,
        suffix,
        parsed_roi,
        parsed_segment_settings,
    )

    return job_to_response(get_job(job_id))


@app.get("/api/videos/jobs/{job_id}")
def get_video_job(job_id: str) -> dict:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_to_response(job)


@app.post("/api/analyze")
async def analyze_video(file: UploadFile = File(...)) -> dict:
    """Legacy synchronous analyze endpoint (blocks until complete)."""
    video_id, upload_path, suffix = _save_upload(file)
    return run_sync_analysis(str(upload_path), video_id, suffix)


@app.get("/api/videos/{filename}")
def get_video(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Video not found")

    return FileResponse(file_path)
