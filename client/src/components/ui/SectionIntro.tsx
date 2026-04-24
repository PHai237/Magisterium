interface SectionIntroProps {
  title: string;
  subtitle?: string;
}

export function SectionIntro({ title, subtitle }: SectionIntroProps) {
  return (
    <section className="mb-4">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </section>
  );
}