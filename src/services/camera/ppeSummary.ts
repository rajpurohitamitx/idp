import type { Detection } from '../../types';

export type PpeItemStatus = 'PRESENT' | 'MISSING' | 'UNKNOWN';
export interface PpeSummary { helmet: PpeItemStatus; vest: PpeItemStatus; gloves: PpeItemStatus; shoes: PpeItemStatus; personDetected: boolean; violations: string[] }

const POS: Record<string, keyof Omit<PpeSummary, 'personDetected' | 'violations'>> = { HELMET: 'helmet', SAFETY_VEST: 'vest', GLOVES: 'gloves', SAFETY_SHOES: 'shoes' };
const NEG: Record<string, keyof Omit<PpeSummary, 'personDetected' | 'violations'>> = { NO_HELMET: 'helmet', NO_SAFETY_VEST: 'vest', NO_GLOVES: 'gloves', NO_SAFETY_SHOES: 'shoes' };

export function summarizePpe(detections: Detection[], minConfidence: number): PpeSummary {
  const s: PpeSummary = { helmet: 'UNKNOWN', vest: 'UNKNOWN', gloves: 'UNKNOWN', shoes: 'UNKNOWN', personDetected: false, violations: [] };
  for (const d of detections) {
    if (d.confidence < minConfidence) continue;
    if (d.type === 'PERSON') s.personDetected = true;
    if (POS[d.type]) s[POS[d.type]] = 'PRESENT';
    if (NEG[d.type]) { s[NEG[d.type]] = 'MISSING'; s.violations.push(d.type); }
  }
  return s;
}
export const isPpeCompliant = (s: PpeSummary) => s.personDetected && s.violations.length === 0;
