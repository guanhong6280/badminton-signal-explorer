import { useEffect, useRef, useState } from "react";

import {
  JOB_POLL_INTERVAL_MS,
  getVideoAnalysisJob,
  jobResultToAnalysisResult,
  startVideoAnalysis,
} from "./api/analysisApi";
import { AnalysisTable } from "./components/AnalysisTable";
import { MotionChart } from "./components/MotionChart";
import { SegmentSettingsPanel } from "./components/SegmentSettingsPanel";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoTimeline } from "./components/VideoTimeline";
import { VideoUploader } from "./components/VideoUploader";
import {
  DEFAULT_SEGMENT_DETECTION_SETTINGS,
  validateSegmentSettings,
} from "./constants/segmentSettings";
import type {
  AnalysisResult,
  AnalysisRoi,
  JobState,
  JobStatus,
  RoiSelectionMode,
  SegmentDetectionSettings,
} from "./types/analysis";
import "./App.css";

const ACTIVE_JOB_STATUSES: JobStatus[] = ["queued", "processing"];

function isActiveJob(status: JobStatus): boolean {
  return ACTIVE_JOB_STATUSES.includes(status);
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollGenerationRef = useRef(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [roi, setRoi] = useState<AnalysisRoi | null>(null);
  const [roiMode, setRoiMode] = useState<RoiSelectionMode>("rectangle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobState, setJobState] = useState<JobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segmentSettings, setSegmentSettings] =
    useState<SegmentDetectionSettings>(DEFAULT_SEGMENT_DETECTION_SETTINGS);

  const segmentSettingsError = validateSegmentSettings(segmentSettings);

  const durationSeconds = analysis?.metadata.durationSeconds ?? 0;
  const videoSrc = analysis?.videoUrl ?? localVideoUrl;
  /** ROI UI only before the first successful analysis; playback-only after results. */
  const isPreAnalysisSetup =
    Boolean(selectedFile && localVideoUrl) && !isProcessing && analysis === null;
  const canSelectRoi = isPreAnalysisSetup;

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const generation = ++pollGenerationRef.current;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || pollGenerationRef.current !== generation) {
        return;
      }

      try {
        const job = await getVideoAnalysisJob(jobId);
        if (cancelled || pollGenerationRef.current !== generation) {
          return;
        }

        setJobState(job);

        if (job.status === "completed") {
          if (job.result) {
            setAnalysis(jobResultToAnalysisResult(job.result));
          }
          setIsProcessing(false);
          cancelled = true;
          return;
        }

        if (job.status === "failed") {
          setError(job.error ?? "Video analysis failed");
          setIsProcessing(false);
          cancelled = true;
        }
      } catch (err) {
        console.warn("[App] Job poll failed, will retry", err);
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, JOB_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [jobId]);

  const handleFileSelected = (file: File) => {
    setError(null);
    setAnalysis(null);
    setJobState(null);
    setJobId(null);
    setCurrentTime(0);
    setRoi(null);
    setSelectedFile(file);
    pollGenerationRef.current += 1;

    const objectUrl = URL.createObjectURL(file);
    setLocalVideoUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return objectUrl;
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      return;
    }

    setError(null);
    setIsProcessing(true);
    setAnalysis(null);
    setJobState(null);
    setJobId(null);
    setCurrentTime(0);
    pollGenerationRef.current += 1;

    try {
      const initialJob = await startVideoAnalysis(
        selectedFile,
        roi,
        segmentSettings,
      );
      setJobState(initialJob);
      setJobId(initialJob.job_id);

      if (initialJob.status === "completed" && initialJob.result) {
        setAnalysis(jobResultToAnalysisResult(initialJob.result));
        setIsProcessing(false);
      } else if (initialJob.status === "failed") {
        setError(initialJob.error ?? "Video analysis failed");
        setIsProcessing(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start analysis";
      setError(message);
      setIsProcessing(false);
      setJobId(null);
    }
  };

  const showProgress =
    isProcessing && jobState !== null && isActiveJob(jobState.status);

  return (
    <main className="app">
      <header className="app-header">
        <h1>Badminton Signal Explorer</h1>
        <p>Upload a video, select the court area, and inspect motion over time.</p>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <VideoUploader
        onFileSelected={handleFileSelected}
        onAnalyze={handleAnalyze}
        hasVideo={selectedFile !== null}
        isProcessing={isProcessing}
        analyzeDisabled={segmentSettingsError !== null}
        progress={showProgress ? jobState.progress : 0}
        progressMessage={showProgress ? jobState.message : undefined}
        showNoRoiWarning={isPreAnalysisSetup && !roi}
      />

      <SegmentSettingsPanel
        settings={segmentSettings}
        onChange={setSegmentSettings}
        disabled={isProcessing}
      />

      <div className="layout-grid">
        <VideoPlayer
          ref={videoRef}
          src={videoSrc}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
          roi={roi}
          onRoiChange={setRoi}
          roiMode={roiMode}
          onRoiModeChange={(mode) => {
            setRoiMode(mode);
            setRoi(null);
          }}
          roiSelectionEnabled={canSelectRoi}
          roiDisabled={isProcessing}
        />

        <VideoTimeline
          durationSeconds={durationSeconds}
          currentTime={currentTime}
          onSeek={seekTo}
        />

        <MotionChart
          motionSeries={analysis?.motionSeries ?? []}
          predictedSegments={analysis?.predictedSegments ?? []}
          segmentSettings={analysis?.segmentSettings}
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
