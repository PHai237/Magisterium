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
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
          {eyebrow}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-white">{title}</h1>

        <p className="mt-3 max-w-2xl text-slate-400">{description}</p>
      </div>

      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}