/** Collision-safe ids for records created in the browser (server keeps them per company). */
export const newId = (prefix: string): string => {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
};

/** Strong temporary password (e.g. "Kp7mR-x2QaZ"), shown once and changed on first sign-in. */
export const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
};

/** Next readable employee code for this company: EMP-0001, EMP-0002, … */
export const nextEmployeeCode = (existing: { id: string }[]): string => {
  const used = new Set(existing.map((e) => e.id.toUpperCase()));
  let n = existing.length + 1;
  while (used.has(`EMP-${String(n).padStart(4, '0')}`)) n++;
  return `EMP-${String(n).padStart(4, '0')}`;
};
