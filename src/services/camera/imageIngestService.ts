import { prisma } from '../../config/db';
import { emit } from '../../sockets';
import { newId } from '../../utils/ids';
import { imageStorage } from '../../utils/storage';
import { getConfig } from '../../config/settings';
import { analyzeImage } from '../ai/aiClient';
import { ConsecutiveTracker } from './consecutiveTracker';
import { summarizePpe, isPpeCompliant } from './ppeSummary';
import { severityForCamera } from '../hazard/severityEngine';
import { createHazard } from '../hazard/hazardService';
import { notFound } from '../../utils/http';
import type { HazardType } from '../../types';

export const tracker = new ConsecutiveTracker();
const HAZARD_TYPES = new Set<HazardType>(['NO_HELMET', 'NO_SAFETY_VEST', 'NO_GLOVES', 'NO_SAFETY_SHOES', 'SMOKE', 'FIRE', 'RESTRICTED_ZONE']);
const lastHazardAt = new Map<string, number>();

export interface IngestImageInput { buf: Buffer; mimeType: string; cameraId: string; deviceId?: string; capturedAt: Date; location?: string; purpose?: 'ENTRY' | 'MONITORING'; workerId?: string; accessLogId?: string }

export async function ingestImage(input: IngestImageInput) {
  const camera = await prisma.camera.findUnique({ where: { cameraId: input.cameraId } });
  if (!camera) throw notFound(`Unknown camera ${input.cameraId}`);
  const location = input.location ?? camera.location;
  const imageId = newId('IMG');
  const t0 = Date.now();

  const storagePath = await imageStorage.save(`${imageId}.jpg`, input.buf);
  const image = await prisma.image.create({
    data: { imageId, cameraId: camera.id, deviceId: input.deviceId, storagePath, mimeType: input.mimeType, sizeBytes: input.buf.length, location, capturedAt: input.capturedAt, status: 'PROCESSING' },
  });
  await prisma.camera.update({ where: { id: camera.id }, data: { status: 'PROCESSING', lastHeartbeat: new Date() } });
  emit('image_received', { imageId, cameraId: camera.cameraId });

  const cfg = await getConfig();
  let ai; const aiStart = Date.now();
  try { ai = await analyzeImage(imageId, input.buf, input.mimeType); }
  catch {
    await prisma.image.update({ where: { id: image.id }, data: { status: 'FAILED' } });
    await prisma.camera.update({ where: { id: camera.id }, data: { status: 'WARNING' } });
    throw new Error('AI_SERVICE_UNAVAILABLE');
  }
  const backendStart = Date.now();

  const detections = ai.detections.filter((d) => d.confidence >= cfg.camera.minimumConfidence);
  const ppe = summarizePpe(detections, cfg.camera.minimumConfidence);
  const overallResult = ppe.personDetected ? (isPpeCompliant(ppe) ? 'COMPLIANT' : 'VIOLATION') : 'NO_PERSON';
  const confidence = detections.length ? Math.max(...detections.map((d) => d.confidence)) : 0;

  const analysis = await prisma.imageAnalysis.create({
    data: {
      analysisId: newId('AN'), imageId: image.id, modelName: ai.modelName, modelVersion: ai.modelVersion, aiProcessingMs: ai.processingTimeMs,
      backendProcessingMs: Date.now() - backendStart, captureToReceiveMs: Math.max(0, aiStart - input.capturedAt.getTime()),
      totalMs: Date.now() - t0, detections: detections as any, ppeSummary: ppe as any, overallResult, confidence,
    },
  });
  for (const d of detections) await prisma.detectionEvent.create({ data: { imageId: image.id, cameraId: camera.cameraId, type: d.type, confidence: d.confidence, boundingBox: d.boundingBox as any } });
  await prisma.image.update({ where: { id: image.id }, data: { status: 'COMPLETE' } });
  await prisma.camera.update({ where: { id: camera.id }, data: { status: 'ONLINE' } });

  let ppeCheck = null;
  if (input.purpose === 'ENTRY') {
    ppeCheck = await prisma.pPECheck.create({ data: { imageId: image.id, workerId: input.workerId, accessLogId: input.accessLogId, cameraId: camera.cameraId, purpose: 'ENTRY', result: overallResult === 'COMPLIANT' ? 'COMPLIANT' : overallResult === 'VIOLATION' ? 'VIOLATION' : 'UNKNOWN', items: ppe as any } });
  } else if (ppe.personDetected) {
    ppeCheck = await prisma.pPECheck.create({ data: { imageId: image.id, cameraId: camera.cameraId, purpose: 'MONITORING', result: isPpeCompliant(ppe) ? 'COMPLIANT' : 'VIOLATION', items: ppe as any } });
  }

  emit('image_analysis_complete', {
    imageId, cameraId: camera.cameraId, location, capturedAt: input.capturedAt, storagePath,
    detections, ppe, overallResult, confidence, latency: { aiMs: ai.processingTimeMs, totalMs: Date.now() - t0 },
  });

  const createdHazards: unknown[] = [];
  if (input.purpose === 'ENTRY') {
    for (const viol of ppe.violations) {
      const type = viol as HazardType;
      const h = await createHazard({ type, severity: severityForCamera(type, confidence, cfg.severity), location, source: 'CAMERA', cameraId: camera.id, imageId: image.id, workerId: input.workerId, confidence });
      createdHazards.push(h);
    }
  } else {
    const flagged = detections.filter((d) => HAZARD_TYPES.has(d.type as HazardType));
    for (const d of flagged) {
      const key = `${camera.cameraId}:${d.type}`;
      const streak = tracker.update(key, true, d.confidence, input.capturedAt.getTime(), cfg.camera.requiredConsecutiveDetections, cfg.camera.maxFrameGapSeconds * 1000);
      if (!streak.confirmed) continue;
      const last = lastHazardAt.get(key) ?? 0;
      if (Date.now() - last < cfg.camera.cooldownSeconds * 1000) continue;
      lastHazardAt.set(key, Date.now());
      tracker.reset(key);
      const h = await createHazard({ type: d.type as HazardType, severity: severityForCamera(d.type as HazardType, streak.avgConfidence, cfg.severity), location, source: 'CAMERA', cameraId: camera.id, imageId: image.id, confidence: streak.avgConfidence });
      createdHazards.push(h);
    }
    for (const t of HAZARD_TYPES) if (!flagged.some((d) => d.type === t)) tracker.update(`${camera.cameraId}:${t}`, false, 0, input.capturedAt.getTime(), 1, 1);
  }

  return { image, analysis, ppe, overallResult, ppeCheck, hazards: createdHazards };
}
