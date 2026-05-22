import type { AnalysisResult } from "../types/analysis";

export async function analyzeVideo(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Video analysis failed");
  }

  return response.json() as Promise<AnalysisResult>;
}
