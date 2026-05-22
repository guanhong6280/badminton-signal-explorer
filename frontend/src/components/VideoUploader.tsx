interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export function VideoUploader({ onFileSelected, isLoading }: VideoUploaderProps) {
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
          }}
        />
        <span>{isLoading ? "Analyzing..." : "Choose video file"}</span>
      </label>
    </section>
  );
}
