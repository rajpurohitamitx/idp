import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import type { Detection } from '../../types';

export interface AiAnalysisResponse {
  imageId: string; modelName: string; modelVersion: string; processingTimeMs: number; detections: Detection[];
}

export async function analyzeImage(imageId: string, buf: Buffer, mimeType: string): Promise<AiAnalysisResponse> {
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(buf)], { type: mimeType }), 'frame');
  form.append('imageId', imageId);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), env.AI_SERVICE_TIMEOUT_MS);
  try {
    const res = await fetch(`${env.AI_SERVICE_URL}/analyze`, { method: 'POST', body: form, signal: controller.signal });
    if (!res.ok) throw new Error(`AI service responded ${res.status}`);
    return (await res.json()) as AiAnalysisResponse;
  } catch (e) {
    logger.error({ err: e, imageId }, 'AI service call failed');
    throw new Error('AI_SERVICE_UNAVAILABLE');
  } finally { clearTimeout(t); }
}

export async function aiServiceHealthy(): Promise<boolean> {
  try { const r = await fetch(`${env.AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) }); return r.ok; }
  catch { return false; }
}
