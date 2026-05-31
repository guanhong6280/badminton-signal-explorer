import { forwardRef, useState } from "react";

import { RoiSelector } from "./RoiSelector";
import type { RoiRect } from "../utils/roiCoordinates";
import { formatRoi } from "../utils/roiCoordinates";

interface VideoPlayerProps {
  src: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  roi?: RoiRect | null;
  onRoiChange?: (roi: RoiRect | null) => void;
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

    const showRoi = roiSelectionEnabled && src && onRoiChange;

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
              {showRoi && (
                <RoiSelector
                  videoElement={videoEl}
                  roi={roi}
                  onRoiChange={onRoiChange}
                  disabled={roiDisabled}
                />
              )}
            </div>
            {showRoi && (
              <div className="roi-controls">
                <p className="roi-coords">
                  {roi
                    ? `Selected ROI (video pixels): ${formatRoi(roi)}`
                    : "Drag on the video to select the court area."}
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
