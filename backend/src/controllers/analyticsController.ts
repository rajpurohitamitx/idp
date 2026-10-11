import { h, ok } from '../utils/http';
import { rangeSchema } from '../validators';
import { rangeToDates, safetyAnalytics, ppeAnalytics, hazardAnalytics, deviceHealthAnalytics, dashboardSnapshot } from '../services/analytics/analyticsService';

export const getDashboard = h(async (_req, res) => ok(res, await dashboardSnapshot()));

export const getAnalytics = h(async (req, res) => {
  const { range, from, to } = rangeSchema.parse(req.query);
  const window = rangeToDates(range, from, to);
  const [safety, ppe, hazards, deviceHealth] = await Promise.all([safetyAnalytics(window), ppeAnalytics(window), hazardAnalytics(window), deviceHealthAnalytics()]);
  ok(res, { range, window, safety, ppe, hazards, deviceHealth });
});
