import { forwardRef } from "react";

interface VideoPlayerProps {
  src: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer({ src, currentTime, onTimeUpdate }, ref) {
    return (
      <section className="panel video-panel">
        <h2>Video preview</h2>
        {src ? (
          <video
            ref={ref}
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
            onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
            onSeeked={(event) => onTimeUpdate(event.currentTarget.currentTime)}
          />
        ) : (
          <p className="placeholder">Upload a video to preview it here.</p>
        )}
        <p className="meta-line">Current time: {currentTime.toFixed(2)}s</p>
      </section>
    );
  },
);
