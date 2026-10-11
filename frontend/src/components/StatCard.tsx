import type { ReactNode } from 'react';
export function StatCard({ label, value, icon, tone }: { label: string; value: ReactNode; icon?: ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  const toneClass = tone === 'bad' ? 'text-hazard-critical' : tone === 'warn' ? 'text-hazard-medium' : 'text-slate-100';
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</div>
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      </div>
      {icon && <div className="text-slate-600">{icon}</div>}
    </div>
  );
}
