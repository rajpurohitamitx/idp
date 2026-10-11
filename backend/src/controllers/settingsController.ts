import { h, ok } from '../utils/http';
import { audit } from '../utils/audit';
import { getConfig, getOverrides, saveConfigOverrides } from '../config/settings';

export const getSettings = h(async (_req, res) => ok(res, { effective: await getConfig(), overrides: await getOverrides() }));

export const updateSettings = h(async (req, res) => {
  const cfg = await saveConfigOverrides(req.body);
  await audit(req.user!.email, 'system_setting_change', { userId: req.user!.id, entity: 'SystemSetting', meta: req.body });
  ok(res, cfg, 'Settings updated');
});
