import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  subtitle,
  children,
  actions,
  className = '',
}: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>

        {actions && <div>{actions}</div>}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}