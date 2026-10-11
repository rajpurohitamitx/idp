import { execSync } from 'node:child_process';
import { prisma } from '../../src/config/db';

export async function resetDb() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  const tables = ['AuditLog', 'DeviceCommand', 'Incident', 'Alert', 'Hazard', 'PPECheck', 'DetectionEvent', 'ImageAnalysis', 'Image', 'AccessLog', 'RestrictedZone', 'SensorReading', 'Sensor', 'Camera', 'Device', 'Worker', 'User', 'SystemSetting'];
  for (const t of tables) await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`);
}
