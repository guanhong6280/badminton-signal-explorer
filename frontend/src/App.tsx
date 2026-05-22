import { useRef, useState } from "react";

import { analyzeVideo } from "./api/analysisApi";
import { AnalysisTable } from "./components/AnalysisTable";
import { MotionChart } from "./components/MotionChart";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoTimeline } from "./components/VideoTimeline";
import { VideoUploader } from "./components/VideoUploader";
import type { AnalysisResult } from "./types/analysis";
import "./App.css";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationSeconds = analysis?.metadata.durationSeconds ?? 0;
  const videoSrc = analysis?.videoUrl ?? localVideoUrl;

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleFileSelected = async (file: File) => {
    setError(null);
    setIsLoading(true);
    setAnalysis(null);
    setCurrentTime(0);

    const objectUrl = URL.createObjectURL(file);
    setLocalVideoUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return objectUrl;
    });

    try {
      const result = await analyzeVideo(file);
      setAnalysis(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>Badminton Signal Explorer</h1>
        <p>Upload a video, sample frames, and inspect motion over time.</p>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <VideoUploader onFileSelected={handleFileSelected} isLoading={isLoading} />

      <div className="layout-grid">
        <VideoPlayer
          ref={videoRef}
          src={videoSrc}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
        />

        <VideoTimeline
          durationSeconds={durationSeconds}
          currentTime={currentTime}
          onSeek={seekTo}
        />

        <MotionChart
          motionSeries={analysis?.motionSeries ?? []}
          onPointSelect={seekTo}
        />

        <AnalysisTable
          motionSeries={analysis?.motionSeries ?? []}
          currentTime={currentTime}
          onRowSelect={seekTo}
        />
      </div>
    </main>
  );
}

export default App;
