import { useCallback, useEffect, useRef, useState } from "react";

import type { PolygonRoi, RoiPoint } from "../types/analysis";
import {
  clampPolygonPoints,
  displayToVideoCoords,
  polygonDisplayPoints,
  videoToDisplayCoords,
} from "../utils/roiCoordinates";

interface PolygonRoiSelectorProps {
  videoElement: HTMLVideoElement | null;
  roi: PolygonRoi | null;
  onRoiChange: (roi: PolygonRoi | null) => void;
  disabled?: boolean;
}

export function PolygonRoiSelector({
  videoElement,
  roi,
  onRoiChange,
  disabled = false,
}: PolygonRoiSelectorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [draftPoints, setDraftPoints] = useState<RoiPoint[]>([]);
  const [layoutTick, setLayoutTick] = useState(0);

  const refreshLayout = useCallback(() => {
    setLayoutTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!videoElement) {
      return;
    }
    const observer = new ResizeObserver(refreshLayout);
    observer.observe(videoElement);
    videoElement.addEventListener("loadedmetadata", refreshLayout);
    window.addEventListener("resize", refreshLayout);
    return () => {
      observer.disconnect();
      videoElement.removeEventListener("loadedmetadata", refreshLayout);
      window.removeEventListener("resize", refreshLayout);
    };
  }, [videoElement, refreshLayout]);

  useEffect(() => {
    if (roi === null) {
      setDraftPoints([]);
    }
  }, [roi]);

  const overlay = overlayRef.current;
  const elementWidth = overlay?.clientWidth ?? 0;
  const elementHeight = overlay?.clientHeight ?? 0;
  const videoWidth = videoElement?.videoWidth ?? 0;
  const videoHeight = videoElement?.videoHeight ?? 0;

  void layoutTick;

  const activeRoi = roi;
  const inProgress = draftPoints.length > 0 && draftPoints.length < 4;

  const displayPointsForRoi = activeRoi
    ? polygonDisplayPoints(
        activeRoi,
        elementWidth,
        elementHeight,
        videoWidth,
        videoHeight,
      )
    : [];

  const displayDraftPoints =
    inProgress && videoWidth > 0
      ? draftPoints
          .map((p) =>
            videoToDisplayCoords(
              p.x,
              p.y,
              elementWidth,
              elementHeight,
              videoWidth,
              videoHeight,
            ),
          )
          .filter((p): p is RoiPoint => p !== null)
      : [];

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !videoElement?.videoWidth || !overlayRef.current) {
      return;
    }
    if (activeRoi) {
      return;
    }

    const rect = overlayRef.current.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const videoPoint = displayToVideoCoords(
      localX,
      localY,
      rect.width,
      rect.height,
      videoWidth,
      videoHeight,
    );
    if (!videoPoint) {
      return;
    }

    const nextDraft = [...draftPoints, videoPoint];
    if (nextDraft.length < 4) {
      setDraftPoints(nextDraft);
      return;
    }

    const polygon: PolygonRoi = {
      type: "polygon",
      points: clampPolygonPoints(nextDraft, videoWidth, videoHeight),
    };
    setDraftPoints([]);
    onRoiChange(polygon);
  };

  const pointsToDraw = activeRoi ? displayPointsForRoi : displayDraftPoints;
  const closed = Boolean(activeRoi && pointsToDraw.length === 4);
  const showClosingEdge = closed || (inProgress && draftPoints.length === 4);

  const polylinePoints = pointsToDraw.map((p) => `${p.x},${p.y}`).join(" ");
  const polygonPoints =
    closed && pointsToDraw.length === 4
      ? [...pointsToDraw, pointsToDraw[0]].map((p) => `${p.x},${p.y}`).join(" ")
      : polylinePoints;

  return (
    <div
      ref={overlayRef}
      className={`roi-overlay roi-overlay--polygon${disabled ? " roi-overlay--disabled" : ""}`}
      onClick={handleClick}
    >
      {pointsToDraw.length >= 2 && (
        <svg className="roi-svg" aria-hidden>
          {closed ? (
            <polygon className="roi-polygon-fill" points={polygonPoints} />
          ) : null}
          <polyline
            className="roi-polygon-stroke"
            points={polylinePoints}
            fill="none"
          />
          {showClosingEdge && inProgress && pointsToDraw.length === 4 ? (
            <line
              className="roi-polygon-stroke"
              x1={pointsToDraw[3].x}
              y1={pointsToDraw[3].y}
              x2={pointsToDraw[0].x}
              y2={pointsToDraw[0].y}
            />
          ) : null}
        </svg>
      )}
      {pointsToDraw.map((p, index) => (
        <div
          key={`${p.x}-${p.y}-${index}`}
          className="roi-point-marker"
          style={{ left: p.x, top: p.y }}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}
