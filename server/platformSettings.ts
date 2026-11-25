/**
 * Platform-wide settings the owner edits from the panel: plans/prices and the
 * broadcast banner shown inside every company's app.
 */
import { query } from './db.js';

export interface Plan { name: string; maxEmployees: number; priceBdt: number }
export interface Broadcast { id: string; message: string; level: 'info' | 'warning' | 'success'; active: boolean; updatedAt: string }

export const DEFAULT_PLANS: Record<string, Plan> = {
  trial: { name: 'Free Trial', maxEmployees: 25, priceBdt: 0 },
  starter: { name: 'Starter', maxEmployees: 25, priceBdt: 1500 },
  business: { name: 'Business', maxEmployees: 100, priceBdt: 4000 },
  enterprise: { name: 'Enterprise', maxEmployees: 1000, priceBdt: 12000 },
};

let cache: { plans: Record<string, Plan>; broadcast: Broadcast | null; at: number } = { plans: DEFAULT_PLANS, broadcast: null, at: 0 };
const TTL_MS = 30_000;

/** Reloads settings if the cache is older than 30s. Cheap to call on every request. */
export const refreshPlatformSettings = async (force = false) => {
  if (!force && Date.now() - cache.at < TTL_MS) return cache;
  try {
    const r = await query(`SELECT key, value FROM platform_settings WHERE key IN ('plans','broadcast')`);
    const map = Object.fromEntries(r.rows.map((row) => [row.key, row.value]));
    cache = {
      plans: { ...DEFAULT_PLANS, ...(map.plans || {}), trial: { ...DEFAULT_PLANS.trial, ...(map.plans?.trial || {}), priceBdt: 0 } },
      broadcast: map.broadcast || null,
      at: Date.now(),
    };
  } catch (err) {
    console.error('platform settings load failed', err);
  }
  return cache;
};

/** Current plans (sync, from cache — call refreshPlatformSettings() earlier in the request). */
export const plans = () => cache.plans;
export const activeBroadcast = () => (cache.broadcast?.active ? cache.broadcast : null);

export const savePlatformSetting = async (key: 'plans' | 'broadcast', value: unknown) => {
  await query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
  return refreshPlatformSettings(true);
};
