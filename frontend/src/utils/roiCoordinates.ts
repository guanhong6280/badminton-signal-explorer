import type { AnalysisRoi, PolygonRoi, RectangleRoi, RoiPoint } from "../types/analysis";

export interface ContentRect {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** Letterboxed video content area inside the displayed element box. */
export function getVideoContentRect(
  elementWidth: number,
  elementHeight: number,
  videoWidth: number,
  videoHeight: number,
): ContentRect | null {
  if (elementWidth <= 0 || elementHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return null;
  }

  const elementAspect = elementWidth / elementHeight;
  const videoAspect = videoWidth / videoHeight;

  if (elementAspect > videoAspect) {
    const height = elementHeight;
    const width = elementHeight * videoAspect;
    return {
      offsetX: (elementWidth - width) / 2,
      offsetY: 0,
      width,
      height,
    };
  }

  const width = elementWidth;
  const height = elementWidth / videoAspect;
  return {
    offsetX: 0,
    offsetY: (elementHeight - height) / 2,
    width,
    height,
  };
}

/** Map overlay-local display coordinates to video pixel coordinates. */
export function displayToVideoCoords(
  displayX: number,
  displayY: number,
  elementWidth: number,
  elementHeight: number,
  videoWidth: number,
  videoHeight: number,
): RoiPoint | null {
  const content = getVideoContentRect(
    elementWidth,
    elementHeight,
    videoWidth,
    videoHeight,
  );
  if (!content) {
    return null;
  }

  const relX = displayX - content.offsetX;
  const relY = displayY - content.offsetY;
  const scaleX = videoWidth / content.width;
  const scaleY = videoHeight / content.height;

  return {
    x: Math.round(Math.max(0, Math.min(videoWidth, relX * scaleX))),
    y: Math.round(Math.max(0, Math.min(videoHeight, relY * scaleY))),
  };
}

/** Map video pixel coordinates to overlay-local display coordinates. */
export function videoToDisplayCoords(
  videoX: number,
  videoY: number,
  elementWidth: number,
  elementHeight: number,
  videoWidth: number,
  videoHeight: number,
): RoiPoint | null {
  const content = getVideoContentRect(
    elementWidth,
    elementHeight,
    videoWidth,
    videoHeight,
  );
  if (!content) {
    return null;
  }

  const scaleX = content.width / videoWidth;
  const scaleY = content.height / videoHeight;

  return {
    x: content.offsetX + videoX * scaleX,
    y: content.offsetY + videoY * scaleY,
  };
}

/** Map video ROI to overlay-local CSS pixels for drawing the selection box. */
export function videoRoiToDisplayStyle(
  roi: RectangleRoi,
  elementWidth: number,
  elementHeight: number,
  videoWidth: number,
  videoHeight: number,
): { left: number; top: number; width: number; height: number } | null {
  const content = getVideoContentRect(
    elementWidth,
    elementHeight,
    videoWidth,
    videoHeight,
  );
  if (!content) {
    return null;
  }

  const scaleX = content.width / videoWidth;
  const scaleY = content.height / videoHeight;

  return {
    left: content.offsetX + roi.x * scaleX,
    top: content.offsetY + roi.y * scaleY,
    width: roi.width * scaleX,
    height: roi.height * scaleY,
  };
}

/** Normalize drag corners into a positive-width ROI in video coordinates. */
export function normalizeVideoRoi(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  videoWidth: number,
  videoHeight: number,
): RectangleRoi {
  const left = Math.max(0, Math.min(x1, x2));
  const top = Math.max(0, Math.min(y1, y2));
  const right = Math.min(videoWidth, Math.max(x1, x2));
  const bottom = Math.min(videoHeight, Math.max(y1, y2));
  return {
    type: "rectangle",
    x: Math.round(left),
    y: Math.round(top),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  };
}

export function clampPolygonPoints(
  points: RoiPoint[],
  videoWidth: number,
  videoHeight: number,
): [RoiPoint, RoiPoint, RoiPoint, RoiPoint] {
  const clamped = points.slice(0, 4).map((p) => ({
    x: Math.round(Math.max(0, Math.min(videoWidth, p.x))),
    y: Math.round(Math.max(0, Math.min(videoHeight, p.y))),
  }));
  while (clamped.length < 4) {
    clamped.push({ x: 0, y: 0 });
  }
  return clamped as [RoiPoint, RoiPoint, RoiPoint, RoiPoint];
}

export function formatAnalysisRoi(roi: AnalysisRoi): string {
  if (roi.type === "rectangle") {
    return `rectangle: x=${roi.x}, y=${roi.y}, w=${roi.width}, h=${roi.height}`;
  }
  const pts = roi.points.map((p) => `(${p.x}, ${p.y})`).join(" → ");
  return `polygon: ${pts}`;
}

export function polygonDisplayPoints(
  roi: PolygonRoi,
  elementWidth: number,
  elementHeight: number,
  videoWidth: number,
  videoHeight: number,
): RoiPoint[] {
  return roi.points
    .map((p) =>
      videoToDisplayCoords(p.x, p.y, elementWidth, elementHeight, videoWidth, videoHeight),
    )
    .filter((p): p is RoiPoint => p !== null);
}
