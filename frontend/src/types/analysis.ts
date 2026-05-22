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
