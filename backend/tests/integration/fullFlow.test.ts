import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/db';
import { resetDb } from './setup';

describe('Industrial Guardian — end-to-end scenarios', () => {
  const app = createApp();
  let adminToken: string;
  let deviceToken: string;

  beforeAll(async () => {
    await resetDb();
    const bcrypt = await import('bcryptjs');
    await prisma.user.create({ data: { email: 'admin@test.local', name: 'Test Admin', role: 'ADMIN', passwordHash: await bcrypt.hash('TestAdmin@123', 10) } });
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.local', password: 'TestAdmin@123' });
    adminToken = login.body.data.token;

    const deviceRes = await request(app).post('/api/devices').set('Authorization', `Bearer ${adminToken}`).send({ deviceId: 'TEST-ESP32-1', name: 'Test Controller', type: 'SENSOR_CONTROLLER', location: 'Production Floor A' });
    deviceToken = deviceRes.body.data.deviceToken;

    await request(app).post('/api/cameras').set('Authorization', `Bearer ${adminToken}`).send({ cameraId: 'TEST-CAM-1', name: 'Test Camera', location: 'Production Floor A' });
    await request(app).post('/api/sensors').set('Authorization', `Bearer ${adminToken}`).send({ sensorId: 'TEST-GAS-1', name: 'Test Gas Sensor', type: 'GAS', unit: 'ppm', location: 'Production Floor A', warningThreshold: 40, criticalThreshold: 70, deviceId: 'TEST-ESP32-1' });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('device heartbeat brings the device ONLINE', async () => {
    const res = await request(app).post('/api/devices/heartbeat').send({ deviceId: 'TEST-ESP32-1', timestamp: new Date().toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ONLINE');
  });

  it('sensor scenario: persistent critical gas readings create a hazard + alert + incident', async () => {
    const now = Date.now();
    for (let i = 0; i < 2; i++) {
      await request(app).post('/api/v1/sensors/readings').set('Authorization', `Bearer ${deviceToken}`)
        .send({ deviceId: 'TEST-ESP32-1', readings: [{ eventId: `E${now}-${i}`, sensorId: 'TEST-GAS-1', sensorType: 'GAS', value: 82.5, unit: 'ppm', timestamp: new Date(now + i * 1000).toISOString() }] });
    }
    const hazards = await request(app).get('/api/hazards?type=GAS_LEAK').set('Authorization', `Bearer ${adminToken}`);
    expect(hazards.body.data.length).toBeGreaterThan(0);
    const alerts = await request(app).get('/api/alerts').set('Authorization', `Bearer ${adminToken}`);
    expect(alerts.body.data.some((a: any) => a.severity === 'HIGH' || a.severity === 'CRITICAL')).toBe(true);
  });

  it('duplicate eventId is a no-op (duplicate protection)', async () => {
    const res = await request(app).post('/api/v1/sensors/readings').set('Authorization', `Bearer ${deviceToken}`)
      .send({ deviceId: 'TEST-ESP32-1', readings: [{ eventId: 'DUPLICATE-TEST-1', sensorId: 'TEST-GAS-1', sensorType: 'GAS', value: 10, unit: 'ppm', timestamp: new Date().toISOString() }] });
    const res2 = await request(app).post('/api/v1/sensors/readings').set('Authorization', `Bearer ${deviceToken}`)
      .send({ deviceId: 'TEST-ESP32-1', readings: [{ eventId: 'DUPLICATE-TEST-1', sensorId: 'TEST-GAS-1', sensorType: 'GAS', value: 999, unit: 'ppm', timestamp: new Date().toISOString() }] });
    expect(res.body.data.accepted).toBe(1);
    expect(res2.body.data.accepted).toBe(1);
    const count = await prisma.sensorReading.count({ where: { eventId: 'DUPLICATE-TEST-1' } });
    expect(count).toBe(1);
  });

  it('health endpoint reports database connectivity', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.database).toBe('connected');
  });

  it('rejects hardware endpoints without a device token', async () => {
    const res = await request(app).post('/api/v1/sensors/readings').send({ deviceId: 'TEST-ESP32-1', readings: [{ eventId: 'NOAUTH-1', sensorId: 'TEST-GAS-1', value: 1, timestamp: new Date().toISOString() }] });
    expect(res.status).toBe(401);
  });

  it('rejects camera/sensor management endpoints for non-admin roles', async () => {
    await prisma.user.create({ data: { email: 'sup@test.local', name: 'Sup', role: 'SUPERVISOR', passwordHash: (await import('bcryptjs')).hashSync('Sup@12345', 10) } });
    const login = await request(app).post('/api/auth/login').send({ email: 'sup@test.local', password: 'Sup@12345' });
    const res = await request(app).post('/api/cameras').set('Authorization', `Bearer ${login.body.data.token}`).send({ cameraId: 'X', name: 'X', location: 'X' });
    expect(res.status).toBe(403);
  });
});
