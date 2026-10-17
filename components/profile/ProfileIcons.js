'use client';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const AVATAR_COUNT = 32;
export const DEFAULT_AVATAR = 'a01';

export const AVATARS = Array.from({ length: AVATAR_COUNT }, (_, i) => {
  const key = `a${String(i + 1).padStart(2, '0')}`;
  return { key, label: `Avatar ${i + 1}`, src: `/avatars/${key}.webp` };
});

// Profiles saved before the illustrated avatars used icon keys like "bull".
// Map any unknown key to a stable avatar so those users still see a face.
export function avatarFor(key) {
  const hit = AVATARS.find((a) => a.key === key);
  if (hit) return hit;
  let h = 0;
  for (const ch of String(key || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[key ? h % AVATARS.length : 0];
}

function Wrap({ size = 18, className = '', children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g {...S}>{children}</g>
    </svg>
  );
}
export const UserGlyph = (p) => (<Wrap {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20.5c0-3.8 3.6-6.5 8-6.5s8 2.7 8 6.5" /></Wrap>);
export const PaletteGlyph = (p) => (<Wrap {...p}><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.6-2.1-.5-1.3.4-2.4 1.7-2.4H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z" /><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01" /></Wrap>);
export const SlidersGlyph = (p) => (<Wrap {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></Wrap>);
export const DatabaseGlyph = (p) => (<Wrap {...p}><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /></Wrap>);
export const LockGlyph = (p) => (<Wrap {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" /></Wrap>);
export const DiceGlyph = (p) => (<Wrap {...p}><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" /></Wrap>);
export const CheckGlyph = (p) => (<Wrap {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Wrap>);
export const CrossGlyph = (p) => (<Wrap {...p}><path d="M6 6l12 12M18 6L6 18" /></Wrap>);
export const ImageGlyph = (p) => (<Wrap {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-4.5-4.5L7 19.5" /></Wrap>);
export const DownloadGlyph = (p) => (<Wrap {...p}><path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14" /></Wrap>);
export const UploadGlyph = (p) => (<Wrap {...p}><path d="M12 16V5M7.5 9L12 4.5 16.5 9M5 20h14" /></Wrap>);
