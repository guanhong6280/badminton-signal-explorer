import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MotionPoint } from "../types/analysis";

interface MotionChartProps {
  motionSeries: MotionPoint[];
  onPointSelect: (time: number) => void;
}

export function MotionChart({
  motionSeries,
  onPointSelect,
}: MotionChartProps) {
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
      <h2>Motion score</h2>
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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
          />
          <YAxis domain={[0, 1]} tickFormatter={(value) => Number(value).toFixed(2)} />
          <Tooltip
            formatter={(value) => [Number(value).toFixed(3), "Motion score"]}
            labelFormatter={(label) => `Time: ${Number(label).toFixed(2)}s`}
          />
          <Line
            type="monotone"
            dataKey="motionScore"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
