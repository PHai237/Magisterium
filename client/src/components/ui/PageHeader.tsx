import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
          {eyebrow}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-white">{title}</h1>

        <p className="mt-3 max-w-2xl text-slate-400">{description}</p>
      </div>

      {actions && <div className="w-full lg:w-auto">{actions}</div>}
    </header>
  );
}