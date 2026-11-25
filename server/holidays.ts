/**
 * Government holiday sync, per company. Uses date.nager.at plus the curated
 * Bangladesh calendar (moon-dependent dates). Edited/deleted government
 * holidays are remembered in `holidayExclusions` so a re-sync never undoes them.
 */
import { query } from './db.js';
import * as db from './records.js';
import { withDefaults } from './company.js';
import { CURATED_BD_HOLIDAYS } from './bdHolidays.js';
import type { CompanyRow } from './auth.js';

const STALE_MS = 7 * 86400_000;
const dayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

const fetchNager = async (country: string) => {
  const year = new Date().getFullYear();
  const out = new Map<string, { title: string; type: string }>();
  await Promise.all([year, year + 1].map(async (y) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const resp = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${country}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!resp.ok) return;
      for (const e of (await resp.json()) as any[]) {
        if (e.date && e.name) out.set(e.date, { title: e.name, type: e.types?.includes('Public') ? 'national' : 'optional' });
      }
    } catch (err) {
      console.error(`holiday fetch failed ${country} ${y}`, err);
    }
  }));
  return out;
};

export const syncGovernmentHolidays = async (company: CompanyRow) => {
  const settings = withDefaults(company.settings);
  const country = String(settings.country || 'BD').toUpperCase();
  const candidates = await fetchNager(country);
  if (country === 'BD') for (const h of CURATED_BD_HOLIDAYS) candidates.set(h.date, { title: h.title, type: h.type });

  const existing = await db.list(company.id, 'holidays');
  const exclusions = new Set((await db.list(company.id, 'holidayExclusions')).map((x) => x.id));
  const manualDates = new Set(existing.filter((h) => h.source !== 'government').map((h) => h.date));
  const govById = new Map(existing.filter((h) => h.externalId).map((h) => [h.externalId, h]));

  let added = 0, updated = 0, skipped = 0;
  for (const [date, info] of candidates) {
    const externalId = `gov-${date}`;
    if (exclusions.has(externalId) || manualDates.has(date)) { skipped++; continue; }
    const prev = govById.get(externalId);
    await db.put(company.id, 'holidays', {
      id: prev?.id || `gov-${date}`,
      title: info.title,
      date,
      dayOfWeek: dayName(date),
      type: info.type,
      appliesTo: 'All Employees',
      source: 'government',
      externalId,
    });
    if (prev) updated++; else added++;
  }
  await query(
    `UPDATE companies SET settings = settings || jsonb_build_object('holidaySyncedAt', to_jsonb(NOW()::text)) WHERE id = $1`,
    [company.id]
  );
  return { added, updated, skipped };
};

export const getHolidays = async (company: CompanyRow) => {
  const last = company.settings?.holidaySyncedAt;
  if (!last) {
    await syncGovernmentHolidays(company).catch((e) => console.error('initial holiday sync failed', e));
  } else if (Date.now() - new Date(last).getTime() > STALE_MS) {
    syncGovernmentHolidays(company).catch((e) => console.error('background holiday sync failed', e));
  }
  const list = await db.list(company.id, 'holidays');
  return list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
};
