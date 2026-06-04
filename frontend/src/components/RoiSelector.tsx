import type { AnalysisRoi, RoiSelectionMode } from "../types/analysis";
import { PolygonRoiSelector } from "./PolygonRoiSelector";
import { RectangleRoiSelector } from "./RectangleRoiSelector";

interface RoiSelectorProps {
  mode: RoiSelectionMode;
  videoElement: HTMLVideoElement | null;
  roi: AnalysisRoi | null;
  onRoiChange: (roi: AnalysisRoi | null) => void;
  disabled?: boolean;
}

export function RoiSelector({
  mode,
  videoElement,
  roi,
  onRoiChange,
  disabled = false,
}: RoiSelectorProps) {
  if (mode === "rectangle") {
    const rectRoi = roi?.type === "rectangle" ? roi : null;
    return (
      <RectangleRoiSelector
        videoElement={videoElement}
        roi={rectRoi}
        onRoiChange={onRoiChange}
        disabled={disabled}
      />
    );
  }

  const polygonRoi = roi?.type === "polygon" ? roi : null;
  return (
    <PolygonRoiSelector
      videoElement={videoElement}
      roi={polygonRoi}
      onRoiChange={onRoiChange}
      disabled={disabled}
    />
  );
}
