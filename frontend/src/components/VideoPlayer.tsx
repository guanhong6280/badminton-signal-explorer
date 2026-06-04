import { forwardRef, useState } from "react";

import { RoiSelector } from "./RoiSelector";
import type { AnalysisRoi, RoiSelectionMode } from "../types/analysis";
import { formatAnalysisRoi } from "../utils/roiCoordinates";

interface VideoPlayerProps {
  src: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  roi?: AnalysisRoi | null;
  onRoiChange?: (roi: AnalysisRoi | null) => void;
  roiMode?: RoiSelectionMode;
  onRoiModeChange?: (mode: RoiSelectionMode) => void;
  roiSelectionEnabled?: boolean;
  roiDisabled?: boolean;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer(
    {
      src,
      currentTime,
      onTimeUpdate,
      roi = null,
      onRoiChange,
      roiMode = "rectangle",
      onRoiModeChange,
      roiSelectionEnabled = false,
      roiDisabled = false,
    },
    ref,
  ) {
    const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

    const setRefs = (node: HTMLVideoElement | null) => {
      setVideoEl(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // When false (e.g. after analysis), no overlay — native video controls work normally.
    const showRoi = Boolean(roiSelectionEnabled && src && onRoiChange);

    const hint =
      roiMode === "rectangle"
        ? "Drag on the video to draw a rectangle around the court."
        : "Click four corners on the video to outline the court (angled view).";

    return (
      <section className="panel video-panel">
        <h2>Video preview</h2>
        {src ? (
          <>
            <div className="video-container">
              <video
                ref={setRefs}
                className="video-player"
                src={src}
                controls
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  console.log("[VideoPlayer] onLoadedMetadata", {
                    src: video.currentSrc,
                    duration: video.duration,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                  });
                }}
                onCanPlay={(event) => {
                  const video = event.currentTarget;
                  console.log("[VideoPlayer] onCanPlay", {
                    src: video.currentSrc,
                    readyState: video.readyState,
                  });
                }}
                onError={(event) => {
                  const video = event.currentTarget;
                  const mediaError = video.error;
                  console.error("[VideoPlayer] onError", {
                    src: video.currentSrc,
                    code: mediaError?.code,
                    message: mediaError?.message,
                  });
                }}
                onTimeUpdate={(event) =>
                  onTimeUpdate(event.currentTarget.currentTime)
                }
                onSeeked={(event) => onTimeUpdate(event.currentTarget.currentTime)}
              />
              {showRoi && onRoiModeChange && (
                <div className="roi-mode-toggle">
                  <button
                    type="button"
                    className={roiMode === "rectangle" ? "active" : ""}
                    disabled={roiDisabled}
                    onClick={() => onRoiModeChange("rectangle")}
                  >
                    Rectangle
                  </button>
                  <button
                    type="button"
                    className={roiMode === "polygon" ? "active" : ""}
                    disabled={roiDisabled}
                    onClick={() => onRoiModeChange("polygon")}
                  >
                    4-point court
                  </button>
                </div>
              )}
              {showRoi && onRoiChange && (
                <RoiSelector
                  mode={roiMode}
                  videoElement={videoEl}
                  roi={roi}
                  onRoiChange={onRoiChange}
                  disabled={roiDisabled}
                />
              )}
            </div>
            {showRoi && onRoiChange && (
              <div className="roi-controls">
                <p className="roi-coords">
                  {roi
                    ? `Selected ROI (video pixels): ${formatAnalysisRoi(roi)}`
                    : hint}
                </p>
                <button
                  type="button"
                  className="roi-clear-btn"
                  disabled={!roi || roiDisabled}
                  onClick={() => onRoiChange(null)}
                >
                  Clear selection
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="placeholder">Upload a video to preview it here.</p>
        )}
        <p className="meta-line">Current time: {currentTime.toFixed(2)}s</p>
      </section>
    );
  },
);
