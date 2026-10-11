export interface StreakResult { streak: number; confirmed: boolean; avgConfidence: number }

export class ConsecutiveTracker {
  private state = new Map<string, { streak: number; last: number; confSum: number }>();

  update(key: string, detected: boolean, confidence: number, nowMs: number, required: number, maxGapMs: number): StreakResult {
    const prev = this.state.get(key);
    if (!detected) {
      this.state.delete(key);
      return { streak: 0, confirmed: false, avgConfidence: 0 };
    }
    let cur = prev && nowMs - prev.last <= maxGapMs ? prev : { streak: 0, last: nowMs, confSum: 0 };
    cur = { streak: cur.streak + 1, last: nowMs, confSum: cur.confSum + confidence };
    this.state.set(key, cur);
    return { streak: cur.streak, confirmed: cur.streak >= required, avgConfidence: cur.confSum / cur.streak };
  }

  reset(key?: string) { key ? this.state.delete(key) : this.state.clear(); }
}
