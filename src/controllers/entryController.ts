import { prisma } from '../config/db';
import { h, ok, notFound, badRequest } from '../utils/http';
import { sniffImage } from '../middleware/upload';
import { ingestImage } from '../services/camera/imageIngestService';
import { isPpeCompliant } from '../services/camera/ppeSummary';
import { emit } from '../sockets';
import { z } from 'zod';

const entryFieldsSchema = z.object({ cameraId: z.string().min(1) });

export const entryCheck = h(async (req, res) => {
  const log = await prisma.accessLog.findUnique({ where: { eventId: req.params.eventId }, include: { worker: true } });
  if (!log) throw notFound(`Unknown access event ${req.params.eventId}`);
  if (log.decision !== 'PENDING_PPE') throw badRequest(`Access event already resolved as ${log.decision}`);
  if (!req.file) throw badRequest('image file is required');
  const mime = sniffImage(req.file.buffer);
  if (!mime) throw badRequest('File content does not match an allowed image type (JPEG/PNG/WebP)');
  const { cameraId } = entryFieldsSchema.parse(req.body);

  const result = await ingestImage({
    buf: req.file.buffer, mimeType: mime, cameraId, deviceId: req.device?.deviceId, capturedAt: new Date(),
    purpose: 'ENTRY', workerId: log.workerId ?? undefined, accessLogId: log.id,
  });

  const compliant = isPpeCompliant(result.ppe);
  const updated = await prisma.accessLog.update({
    where: { id: log.id },
    data: { decision: compliant ? 'APPROVED' : 'DENIED', reason: compliant ? undefined : `PPE violation: ${result.ppe.violations.join(', ')}` },
  });
  emit('access_event', { eventId: updated.eventId, worker: log.worker ? { employeeId: log.worker.employeeId, name: log.worker.name } : null, decision: updated.decision });

  ok(res, { eventId: updated.eventId, decision: updated.decision, ppe: result.ppe, hazardsCreated: result.hazards.length, imageId: result.image.imageId }, compliant ? 'Entry approved' : 'Entry denied — PPE violation', 201);
});
