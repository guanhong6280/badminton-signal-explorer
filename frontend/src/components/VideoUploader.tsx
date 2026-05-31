interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  progress?: number;
  progressMessage?: string;
}

export function VideoUploader({
  onFileSelected,
  isLoading,
  progress = 0,
  progressMessage,
}: VideoUploaderProps) {
  return (
    <section className="panel uploader-panel">
      <h2>Upload video</h2>
      <p className="hint">Select a local badminton video to analyze motion over time.</p>
      <label className="upload-label">
        <input
          type="file"
          accept="video/*,.mp4,.mov,.m4v,.avi"
          disabled={isLoading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onFileSelected(file);
            }
            event.target.value = "";
          }}
        />
        <span>{isLoading ? "Processing..." : "Choose video file"}</span>
      </label>

      {isLoading && (
        <div className="analysis-progress" role="status" aria-live="polite">
          <div className="analysis-progress-header">
            <span>Analyzing video…</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="analysis-progress-track">
            <div
              className="analysis-progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          {progressMessage && (
            <p className="analysis-progress-message">{progressMessage}</p>
          )}
        </div>
      )}
    </section>
  );
}
