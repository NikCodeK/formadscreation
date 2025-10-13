import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  subtitle?: string;
  countLabel?: string;
  children: ReactNode;
  aside?: ReactNode;
}

export function Section({ title, subtitle, countLabel, children, aside }: SectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {aside}
          {countLabel ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {countLabel}
            </span>
          ) : null}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
