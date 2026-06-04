import type { PredictedSegment } from "../types/analysis";

export interface SegmentSummary {
  activeDurationSeconds: number;
  deadDurationSeconds: number;
  activeSegmentCount: number;
  deadSegmentCount: number;
}

export function computeSegmentSummary(
  segments: PredictedSegment[],
): SegmentSummary {
  let activeDurationSeconds = 0;
  let deadDurationSeconds = 0;
  let activeSegmentCount = 0;
  let deadSegmentCount = 0;

  for (const segment of segments) {
    const duration = Math.max(0, segment.endTime - segment.startTime);
    if (segment.label === "active") {
      activeDurationSeconds += duration;
      activeSegmentCount += 1;
    } else if (segment.label === "dead") {
      deadDurationSeconds += duration;
      deadSegmentCount += 1;
    }
  }

  return {
    activeDurationSeconds,
    deadDurationSeconds,
    activeSegmentCount,
    deadSegmentCount,
  };
}
