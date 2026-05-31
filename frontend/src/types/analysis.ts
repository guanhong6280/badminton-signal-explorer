/** Job API status values from the backend. */
export type JobStatus = "queued" | "processing" | "completed" | "failed";

/** Snake_case metadata inside a completed job result. */
export interface ApiVideoMetadata {
  duration_seconds: number;
  fps: number;
  width: number;
  height: number;
  sampled_fps: number;
}

export interface MotionSample {
  time: number;
  motion_score: number;
}

export interface Segment {
  start_time: number;
  end_time: number;
  label: string;
}

/** Completed job payload from GET /api/videos/jobs/{job_id}. */
export interface JobAnalysisResult {
  video_id: string;
  video_url: string;
  metadata: ApiVideoMetadata;
  motion_samples: MotionSample[];
  segments: Segment[];
}

export interface JobState {
  job_id: string;
  status: JobStatus;
  progress: number;
  message: string;
  result: JobAnalysisResult | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** CamelCase shape used by chart/timeline components. */
export interface VideoMetadata {
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
  sampledFps: number;
}

export interface MotionPoint {
  time: number;
  motionScore: number;
}

export interface PredictedSegment {
  startTime: number;
  endTime: number;
  label: string;
}

export interface AnalysisResult {
  videoId: string;
  videoUrl: string;
  metadata: VideoMetadata;
  motionSeries: MotionPoint[];
  predictedSegments: PredictedSegment[];
}
