import { useCallback, useEffect, useRef, useState } from "react";

import type { RectangleRoi } from "../types/analysis";
import {
  displayToVideoCoords,
  normalizeVideoRoi,
  videoRoiToDisplayStyle,
} from "../utils/roiCoordinates";

interface RectangleRoiSelectorProps {
  videoElement: HTMLVideoElement | null;
  roi: RectangleRoi | null;
  onRoiChange: (roi: RectangleRoi | null) => void;
  disabled?: boolean;
}

export function RectangleRoiSelector({
  videoElement,
  roi,
  onRoiChange,
  disabled = false,
}: RectangleRoiSelectorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
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

  const getLocalPoint = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return null;
    }
    const rect = overlay.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const toVideoPoint = (localX: number, localY: number) => {
    if (!videoElement || !overlayRef.current) {
      return null;
    }
    const { width, height } = overlayRef.current.getBoundingClientRect();
    return displayToVideoCoords(
      localX,
      localY,
      width,
      height,
      videoElement.videoWidth,
      videoElement.videoHeight,
    );
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !videoElement?.videoWidth) {
      return;
    }
    event.preventDefault();
    const local = getLocalPoint(event.clientX, event.clientY);
    if (!local) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart(local);
    setDragCurrent(local);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) {
      return;
    }
    const local = getLocalPoint(event.clientX, event.clientY);
    if (local) {
      setDragCurrent(local);
    }
  };

  const finishDrag = (clientX: number, clientY: number) => {
    if (!dragStart || !videoElement?.videoWidth) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const endLocal = getLocalPoint(clientX, clientY);
    if (!endLocal) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const startVideo = toVideoPoint(dragStart.x, dragStart.y);
    const endVideo = toVideoPoint(endLocal.x, endLocal.y);
    if (startVideo && endVideo) {
      onRoiChange(
        normalizeVideoRoi(
          startVideo.x,
          startVideo.y,
          endVideo.x,
          endVideo.y,
          videoElement.videoWidth,
          videoElement.videoHeight,
        ),
      );
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  const overlay = overlayRef.current;
  const elementWidth = overlay?.clientWidth ?? 0;
  const elementHeight = overlay?.clientHeight ?? 0;
  const videoWidth = videoElement?.videoWidth ?? 0;
  const videoHeight = videoElement?.videoHeight ?? 0;

  void layoutTick;

  let selectionStyle: { left: number; top: number; width: number; height: number } | null =
    null;

  if (dragStart && dragCurrent && videoWidth > 0) {
    const startVideo = toVideoPoint(dragStart.x, dragStart.y);
    const endVideo = toVideoPoint(dragCurrent.x, dragCurrent.y);
    if (startVideo && endVideo) {
      const draft = normalizeVideoRoi(
        startVideo.x,
        startVideo.y,
        endVideo.x,
        endVideo.y,
        videoWidth,
        videoHeight,
      );
      selectionStyle = videoRoiToDisplayStyle(
        draft,
        elementWidth,
        elementHeight,
        videoWidth,
        videoHeight,
      );
    }
  } else if (roi && videoWidth > 0) {
    selectionStyle = videoRoiToDisplayStyle(
      roi,
      elementWidth,
      elementHeight,
      videoWidth,
      videoHeight,
    );
  }

  return (
    <div
      ref={overlayRef}
      className={`roi-overlay${disabled ? " roi-overlay--disabled" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        if (dragStart) {
          finishDrag(event.clientX, event.clientY);
        }
      }}
      onPointerCancel={(event) => finishDrag(event.clientX, event.clientY)}
    >
      {selectionStyle && (
        <div
          className="roi-selection"
          style={{
            left: selectionStyle.left,
            top: selectionStyle.top,
            width: selectionStyle.width,
            height: selectionStyle.height,
          }}
        />
      )}
    </div>
  );
}
