import type {
  AnalysisResult,
  JobAnalysisResult,
  JobState,
} from "../types/analysis";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const POLL_INTERVAL_MS = 750;

/** Resolve relative API paths (e.g. /api/videos/...) for fetch and video src. */
export function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path;
}

export function jobResultToAnalysisResult(result: JobAnalysisResult): AnalysisResult {
  return {
    videoId: result.video_id,
    videoUrl: resolveApiUrl(result.video_url),
    metadata: {
      durationSeconds: result.metadata.duration_seconds,
      fps: result.metadata.fps,
      width: result.metadata.width,
      height: result.metadata.height,
      sampledFps: result.metadata.sampled_fps,
    },
    motionSeries: result.motion_samples.map((sample) => ({
      time: sample.time,
      motionScore: sample.motion_score,
    })),
    predictedSegments: result.segments.map((segment) => ({
      startTime: segment.start_time,
      endTime: segment.end_time,
      label: segment.label,
    })),
  };
}

export async function startVideoAnalysis(file: File): Promise<JobState> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(resolveApiUrl("/api/videos/analyze"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to start video analysis");
  }

  return response.json() as Promise<JobState>;
}

export async function getVideoAnalysisJob(jobId: string): Promise<JobState> {
  const response = await fetch(
    resolveApiUrl(`/api/videos/jobs/${encodeURIComponent(jobId)}`),
  );

  if (response.status === 404) {
    throw new Error("Analysis job not found");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch analysis job");
  }

  return response.json() as Promise<JobState>;
}

/** Polling interval in ms (exported for tests/docs). */
export const JOB_POLL_INTERVAL_MS = POLL_INTERVAL_MS;

/** Legacy synchronous endpoint (kept for manual/debug use). */
export async function analyzeVideo(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(resolveApiUrl("/api/analyze"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Video analysis failed");
  }

  const data = (await response.json()) as AnalysisResult;
  return {
    ...data,
    videoUrl: resolveApiUrl(data.videoUrl),
  };
}
