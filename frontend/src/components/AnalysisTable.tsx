import type { MotionPoint } from "../types/analysis";

interface AnalysisTableProps {
  motionSeries: MotionPoint[];
  currentTime: number;
  onRowSelect: (time: number) => void;
}

export function AnalysisTable({
  motionSeries,
  currentTime,
  onRowSelect,
}: AnalysisTableProps) {
  if (motionSeries.length === 0) {
    return (
      <section className="panel table-panel">
        <h2>Motion samples</h2>
        <p className="placeholder">Timestamp and motion score rows will appear here.</p>
      </section>
    );
  }

  return (
    <section className="panel table-panel">
      <h2>Motion samples</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Timestamp (s)</th>
              <th>Motion score</th>
            </tr>
          </thead>
          <tbody>
            {motionSeries.map((point) => {
              const isActive = Math.abs(point.time - currentTime) < 0.25;
              return (
                <tr
                  key={point.time}
                  className={isActive ? "active-row" : undefined}
                  onClick={() => onRowSelect(point.time)}
                >
                  <td>{point.time.toFixed(2)}</td>
                  <td>{point.motionScore.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
