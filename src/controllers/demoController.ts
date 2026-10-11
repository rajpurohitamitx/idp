import { h, ok, forbidden } from '../utils/http';
import { env } from '../config/env';
import { seedDemoData, simulatePpeViolation, simulateSmokeAndGasFusion, simulateAccessAndEntry, simulateDeviceHeartbeat } from '../services/demo/demoService';

function requireDemo() { if (!env.DEMO_MODE_ENABLED) throw forbidden('Demo mode is disabled (DEMO_MODE_ENABLED=false)'); }

export const seed = h(async (_req, res) => { requireDemo(); ok(res, await seedDemoData(), 'Demo data seeded — all records flagged isDemo=true'); });
export const ppe = h(async (_req, res) => { requireDemo(); ok(res, await simulatePpeViolation(), 'Simulated PPE violation — NOT real hardware data'); });
export const fusion = h(async (_req, res) => { requireDemo(); ok(res, await simulateSmokeAndGasFusion(), 'Simulated camera+sensor fusion — NOT real hardware data'); });
export const access = h(async (_req, res) => { requireDemo(); ok(res, await simulateAccessAndEntry(), 'Simulated RFID access event — NOT real hardware data'); });
export const heartbeat = h(async (_req, res) => { requireDemo(); ok(res, await simulateDeviceHeartbeat(), 'Simulated device heartbeat — NOT real hardware data'); });
