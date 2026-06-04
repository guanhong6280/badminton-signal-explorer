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
  /** Present after Segment Detector V2; safe to ignore in charts. */
  smoothed_motion_score?: number;
  predicted_label?: "active" | "dead";
}

export interface Segment {
  start_time: number;
  end_time: number;
  label: string;
}

export interface RoiPoint {
  x: number;
  y: number;
}

export interface RectangleRoi {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonRoi {
  type: "polygon";
  points: [RoiPoint, RoiPoint, RoiPoint, RoiPoint];
}

export type AnalysisRoi = RectangleRoi | PolygonRoi;

export type RoiSelectionMode = "rectangle" | "polygon";

/** @deprecated Use RectangleRoi with type field */
export interface RoiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Completed job payload from GET /api/videos/jobs/{job_id}. */
export interface JobAnalysisResult {
  video_id: string;
  video_url: string;
  metadata: ApiVideoMetadata;
  motion_samples: MotionSample[];
  segments: Segment[];
  segment_settings?: SegmentDetectionSettings;
  roi?: AnalysisRoi | null;
}

export interface SegmentDetectionSettings {
  smoothing_window_samples: number;
  dead_enter_threshold: number;
  active_enter_threshold: number;
  min_dead_duration_seconds: number;
  min_active_duration_seconds: number;
  merge_gap_seconds: number;
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
  /** Segment Detector V2; omitted on legacy results. */
  smoothedMotionScore?: number;
  predictedLabel?: "active" | "dead";
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
  segmentSettings?: SegmentDetectionSettings;
  roi?: AnalysisRoi | null;
}
