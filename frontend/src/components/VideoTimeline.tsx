import { useRef } from "react";

interface VideoTimelineProps {
  durationSeconds: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function VideoTimeline({
  durationSeconds,
  currentTime,
  onSeek,
}: VideoTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const seekFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track || durationSeconds <= 0) {
      return;
    }

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * durationSeconds);
  };

  const progress =
    durationSeconds > 0 ? Math.min(100, (currentTime / durationSeconds) * 100) : 0;

  return (
    <section className="panel timeline-panel">
      <h2>Timeline scrubber</h2>
      <div
        ref={trackRef}
        className="timeline-track"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={durationSeconds}
        aria-valuenow={currentTime}
        tabIndex={0}
        onClick={(event) => seekFromClientX(event.clientX)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            onSeek(Math.min(durationSeconds, currentTime + 0.5));
          }
          if (event.key === "ArrowLeft") {
            onSeek(Math.max(0, currentTime - 0.5));
          }
        }}
      >
        <div className="timeline-progress" style={{ width: `${progress}%` }} />
        <div className="timeline-thumb" style={{ left: `${progress}%` }} />
      </div>
    </section>
  );
}
