interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  onAnalyze: () => void;
  hasVideo: boolean;
  isProcessing: boolean;
  progress?: number;
  progressMessage?: string;
  showNoRoiWarning?: boolean;
}

export function VideoUploader({
  onFileSelected,
  onAnalyze,
  hasVideo,
  isProcessing,
  progress = 0,
  progressMessage,
  showNoRoiWarning = false,
}: VideoUploaderProps) {
  return (
    <section className="panel uploader-panel">
      <h2>Upload video</h2>
      <p className="hint">
        Select a video, draw a rectangle on the court area, then click Analyze.
      </p>
      <label className="upload-label">
        <input
          type="file"
          accept="video/*,.mp4,.mov,.m4v,.avi"
          disabled={isProcessing}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onFileSelected(file);
            }
            event.target.value = "";
          }}
        />
        <span>{isProcessing ? "Processing..." : "Choose video file"}</span>
      </label>

      {showNoRoiWarning && (
        <p className="roi-warning">
          No court area selected. The full frame will be analyzed.
        </p>
      )}

      <button
        type="button"
        className="analyze-btn"
        disabled={!hasVideo || isProcessing}
        onClick={onAnalyze}
      >
        {isProcessing ? "Analyzing..." : "Analyze"}
      </button>

      {isProcessing && (
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
