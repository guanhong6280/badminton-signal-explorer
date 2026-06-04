import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  MotionPoint,
  PredictedSegment,
  SegmentDetectionSettings,
} from "../types/analysis";
import { formatSegmentSettingsSummary } from "../constants/segmentSettings";
import {
  computeSegmentSummary,
  type SegmentSummary,
} from "../utils/segmentSummary";

interface MotionChartProps {
  motionSeries: MotionPoint[];
  predictedSegments?: PredictedSegment[];
  segmentSettings?: SegmentDetectionSettings;
  onPointSelect: (time: number) => void;
}

function formatDuration(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

function SegmentSummaryPanel({ summary }: { summary: SegmentSummary }) {
  return (
    <dl className="segment-summary">
      <div>
        <dt>Active duration</dt>
        <dd>{formatDuration(summary.activeDurationSeconds)}</dd>
      </div>
      <div>
        <dt>Dead duration</dt>
        <dd>{formatDuration(summary.deadDurationSeconds)}</dd>
      </div>
      <div>
        <dt>Active segments</dt>
        <dd>{summary.activeSegmentCount}</dd>
      </div>
      <div>
        <dt>Dead segments</dt>
        <dd>{summary.deadSegmentCount}</dd>
      </div>
    </dl>
  );
}

function SegmentTable({
  segments,
  onRowSelect,
}: {
  segments: PredictedSegment[];
  onRowSelect: (time: number) => void;
}) {
  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="segment-table-wrap">
      <h3 className="segment-table-title">Detected segments</h3>
      <div className="table-scroll segment-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Start (s)</th>
              <th>End (s)</th>
              <th>Duration (s)</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment) => {
              const duration = Math.max(0, segment.endTime - segment.startTime);
              return (
                <tr
                  key={`${segment.label}-${segment.startTime}`}
                  onClick={() => onRowSelect(segment.startTime)}
                >
                  <td>
                    <span
                      className={`segment-label segment-label--${segment.label}`}
                    >
                      {segment.label}
                    </span>
                  </td>
                  <td>{segment.startTime.toFixed(2)}</td>
                  <td>{segment.endTime.toFixed(2)}</td>
                  <td>{duration.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MotionChart({
  motionSeries,
  predictedSegments = [],
  segmentSettings,
  onPointSelect,
}: MotionChartProps) {
  const [showDebugSignal, setShowDebugSignal] = useState(true);

  const hasSmoothedSeries = useMemo(
    () => motionSeries.some((point) => point.smoothedMotionScore !== undefined),
    [motionSeries],
  );

  const deadSegments = useMemo(
    () => predictedSegments.filter((segment) => segment.label === "dead"),
    [predictedSegments],
  );

  const summary = useMemo(
    () => computeSegmentSummary(predictedSegments),
    [predictedSegments],
  );

  const showDebugOverlay =
    showDebugSignal && (hasSmoothedSeries || predictedSegments.length > 0);

  if (motionSeries.length === 0) {
    return (
      <section className="panel chart-panel">
        <h2>Motion score</h2>
        <p className="placeholder">Run analysis to see the motion chart.</p>
      </section>
    );
  }

  return (
    <section className="panel chart-panel">
      <div className="chart-panel-header">
        <h2>Motion score</h2>
        <label className="debug-toggle">
          <input
            type="checkbox"
            checked={showDebugSignal}
            onChange={(event) => setShowDebugSignal(event.target.checked)}
          />
          Show debug signal
        </label>
      </div>

      {showDebugSignal && segmentSettings && (
        <p className="effective-settings hint">
          Effective settings: {formatSegmentSettingsSummary(segmentSettings)}
        </p>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={motionSeries}
          onClick={(state) => {
            const activePayload = (
              state as { activePayload?: Array<{ payload: MotionPoint }> }
            ).activePayload;
            const payload = activePayload?.[0]?.payload;
            if (payload) {
              onPointSelect(payload.time);
            }
          }}
        >
          {showDebugOverlay &&
            deadSegments.map((segment) => (
              <ReferenceArea
                key={`dead-${segment.startTime}-${segment.endTime}`}
                x1={segment.startTime}
                x2={segment.endTime}
                fill="#94a3b8"
                fillOpacity={0.22}
                strokeOpacity={0}
              />
            ))}
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
          />
          <YAxis domain={[0, 1]} tickFormatter={(value) => Number(value).toFixed(2)} />
          <Tooltip
            formatter={(value, name) => {
              const label =
                name === "motionScore"
                  ? "Raw motion score"
                  : name === "smoothedMotionScore"
                    ? "Smoothed motion score"
                    : String(name);
              return [Number(value).toFixed(3), label];
            }}
            labelFormatter={(label) => `Time: ${Number(label).toFixed(2)}s`}
          />
          {showDebugOverlay && hasSmoothedSeries && (
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(value) =>
                value === "motionScore"
                  ? "Raw motion score"
                  : value === "smoothedMotionScore"
                    ? "Smoothed motion score"
                    : value
              }
            />
          )}
          <Line
            type="monotone"
            dataKey="motionScore"
            name="motionScore"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          {showDebugOverlay && hasSmoothedSeries && (
            <Line
              type="monotone"
              dataKey="smoothedMotionScore"
              name="smoothedMotionScore"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {showDebugOverlay && predictedSegments.length > 0 && (
        <>
          <SegmentSummaryPanel summary={summary} />
          <SegmentTable segments={predictedSegments} onRowSelect={onPointSelect} />
        </>
      )}
    </section>
  );
}
