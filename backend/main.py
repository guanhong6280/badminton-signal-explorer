import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.motion_analyzer import compute_motion_series
from services.segment_detector import detect_segments
from services.video_metadata import extract_video_metadata

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
SAMPLE_INTERVAL_SECONDS = 0.5

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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_video(file: UploadFile = File(...)) -> dict:
    video_id = str(uuid.uuid4())
    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    upload_path = UPLOAD_DIR / f"{video_id}{suffix}"

    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata = extract_video_metadata(
        str(upload_path),
        sample_interval_seconds=SAMPLE_INTERVAL_SECONDS,
    )
    motion_series = compute_motion_series(
        str(upload_path),
        sample_interval_seconds=SAMPLE_INTERVAL_SECONDS,
    )
    predicted_segments = detect_segments(motion_series)

    return {
        "videoId": video_id,
        "videoUrl": f"/api/videos/{video_id}{suffix}",
        "metadata": {
            "durationSeconds": round(metadata.duration_seconds, 3),
            "fps": round(metadata.fps, 3),
            "width": metadata.width,
            "height": metadata.height,
            "sampledFps": round(metadata.sampled_fps, 3),
        },
        "motionSeries": [
            {"time": point.time, "motionScore": point.motion_score}
            for point in motion_series
        ],
        "predictedSegments": [
            {
                "startTime": segment.start_time,
                "endTime": segment.end_time,
                "label": segment.label,
            }
            for segment in predicted_segments
        ],
    }


@app.get("/api/videos/{filename}")
def get_video(filename: str):
    from fastapi.responses import FileResponse

    file_path = UPLOAD_DIR / filename
    if not file_path.is_file():
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Video not found")

    return FileResponse(file_path)
