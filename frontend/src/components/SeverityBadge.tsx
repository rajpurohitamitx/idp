import type { Severity } from '../types';
const MAP: Record<Severity, string> = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', CRITICAL: 'badge-critical' };
export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge ${MAP[severity]}`}>{severity}</span>;
}
