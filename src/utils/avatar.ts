const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706', '#0891B2', '#DC2626', '#4F46E5'];

/** Colorful initials avatar as an inline SVG (no stock photos of strangers). */
export const initialsAvatar = (name: string, colorIndex?: number): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = COLORS[(colorIndex ?? h) % COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff">${initials.replace(/[<>&"]/g, '')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** Neutral placeholder used when someone has no photo yet. */
export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#E0E7FF"/><circle cx="48" cy="38" r="16" fill="#6366F1"/><path d="M18 82c4-17 16-24 30-24s26 7 30 24" fill="#6366F1"/></svg>'
)}`;

export const AVATAR_COLOR_COUNT = COLORS.length;
