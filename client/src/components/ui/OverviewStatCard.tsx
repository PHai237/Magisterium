import type { ReactNode } from 'react';

interface OverviewStatCardProps {
  label: string;
  value: ReactNode;
  accentClass?: string;
}

export function OverviewStatCard({
  label,
  value,
  accentClass,
}: OverviewStatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-bold text-white ${accentClass ?? ''}`}>
        {value}
      </p>
    </div>
  );
}