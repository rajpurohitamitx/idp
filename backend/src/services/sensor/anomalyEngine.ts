export interface Sample { value: number; t: number }

export interface AnomalyOpts {
  rateLimitPerMin?: number | null;
  modifiedZ: number;
  minSamples: number;
  minMad: number;
}

export interface AnomalyResult { anomalous: boolean; reason?: 'RATE_OF_CHANGE' | 'STATISTICAL'; score?: number; ratePerMin?: number }

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function detectAnomaly(history: Sample[], current: Sample, opts: AnomalyOpts): AnomalyResult {
  if (history.length) {
    const prev = history[history.length - 1];
    const dtMin = (current.t - prev.t) / 60000;
    if (dtMin > 0 && opts.rateLimitPerMin != null) {
      const rate = Math.abs(current.value - prev.value) / dtMin;
      if (rate > opts.rateLimitPerMin) return { anomalous: true, reason: 'RATE_OF_CHANGE', ratePerMin: rate };
    }
  }
  if (history.length >= opts.minSamples) {
    const vals = history.map((h) => h.value);
    const med = median(vals);
    const mad = Math.max(median(vals.map((v) => Math.abs(v - med))), opts.minMad);
    const score = (0.6745 * Math.abs(current.value - med)) / mad;
    if (score > opts.modifiedZ) return { anomalous: true, reason: 'STATISTICAL', score };
  }
  return { anomalous: false };
}
