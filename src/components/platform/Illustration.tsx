import React from 'react';

/** Original decorative illustration for the welcome banner: floating report cards, a growth chart and coins. */
export const WelcomeIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 260 180" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ill-card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#e7e8ff" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="ill-coin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffd66b" />
        <stop offset="1" stopColor="#f5a623" />
      </linearGradient>
      <linearGradient id="ill-bar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7c7ff7" />
        <stop offset="1" stopColor="#5b5ef4" />
      </linearGradient>
    </defs>
    {/* back card */}
    <rect x="96" y="18" width="128" height="96" rx="16" fill="#ffffff" opacity="0.25" transform="rotate(8 160 66)" />
    {/* main card */}
    <g transform="rotate(-4 140 92)">
      <rect x="70" y="38" width="140" height="110" rx="18" fill="url(#ill-card)" />
      <rect x="86" y="54" width="56" height="8" rx="4" fill="#c7c8fb" />
      <rect x="86" y="68" width="34" height="6" rx="3" fill="#e1e2fd" />
      <rect x="92" y="112" width="14" height="22" rx="4" fill="url(#ill-bar)" opacity="0.55" />
      <rect x="114" y="100" width="14" height="34" rx="4" fill="url(#ill-bar)" opacity="0.75" />
      <rect x="136" y="90" width="14" height="44" rx="4" fill="url(#ill-bar)" />
      <rect x="158" y="80" width="14" height="54" rx="4" fill="#ff6b8b" />
      <rect x="180" y="96" width="14" height="38" rx="4" fill="url(#ill-bar)" opacity="0.8" />
      <polyline points="99,104 121,92 143,84 165,70 187,86" fill="none" stroke="#38c6d9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="165" cy="70" r="5" fill="#ffffff" stroke="#38c6d9" strokeWidth="3" />
    </g>
    {/* coins */}
    <g>
      <ellipse cx="48" cy="140" rx="22" ry="8" fill="#e09a1e" />
      <rect x="26" y="124" width="44" height="16" fill="url(#ill-coin)" />
      <ellipse cx="48" cy="124" rx="22" ry="8" fill="#ffe08a" />
      <ellipse cx="52" cy="110" rx="22" ry="8" fill="#e09a1e" />
      <rect x="30" y="96" width="44" height="14" fill="url(#ill-coin)" />
      <ellipse cx="52" cy="96" rx="22" ry="8" fill="#ffe08a" />
      <text x="52" y="100" textAnchor="middle" fontSize="11" fontWeight="700" fill="#b8750c" fontFamily="Poppins, sans-serif">৳</text>
    </g>
    {/* sparkles */}
    <path d="M226 30 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="#ffffff" opacity="0.9" />
    <circle cx="238" cy="132" r="5" fill="#ff6b8b" />
    <circle cx="30" cy="40" r="4" fill="#38c6d9" />
  </svg>
);
