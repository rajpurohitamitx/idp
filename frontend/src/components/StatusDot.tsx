const COLOR: Record<string, string> = { ONLINE: 'bg-ok', OFFLINE: 'bg-hazard-critical', WARNING: 'bg-hazard-medium', PROCESSING: 'bg-hazard-low' };
export function StatusDot({ status }: { status: string }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><span className={`w-2 h-2 rounded-full ${COLOR[status] ?? 'bg-slate-500'}`} />{status}</span>;
}
