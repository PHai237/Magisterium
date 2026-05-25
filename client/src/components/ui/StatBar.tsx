import { formatNumber } from "../../lib/format";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
}

export function StatBar({ label, value, max }: StatBarProps) {
  const safeMax = Math.max(1, max);
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className="statbar">
      <div className="statbar__top">
        <span>{label}</span>
        <strong>
          {formatNumber(value)} / {formatNumber(max)}
        </strong>
      </div>
      <div className="statbar__track">
        <div className="statbar__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
