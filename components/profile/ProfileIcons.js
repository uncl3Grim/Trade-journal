'use client';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const AVATAR_ICONS = [
  {
    key: 'bull', label: 'Bull',
    node: (<g {...S}><path d="M3.5 4.5c.8 2.7 2.7 4 5 4h7c2.3 0 4.2-1.3 5-4" /><path d="M7 8.5V13a5 5 0 0 0 10 0V8.5" /><path d="M10 12.5h.01M14 12.5h.01" /><path d="M9.5 17.5c1.5 1 3.5 1 5 0" /></g>),
  },
  {
    key: 'bear', label: 'Bear',
    node: (<g {...S}><circle cx="12" cy="13" r="6.5" /><circle cx="6.3" cy="6.8" r="2.3" /><circle cx="17.7" cy="6.8" r="2.3" /><path d="M9.5 12h.01M14.5 12h.01" /><path d="M11 15.5h2M12 15.5v1.3" /></g>),
  },
  {
    key: 'wolf', label: 'Wolf',
    node: (<g {...S}><path d="M4 3l5 4h6l5-4v9c0 5-3.6 9-8 9s-8-4-8-9z" /><path d="M8 12l2.2 1M16 12l-2.2 1" /><path d="M10.5 17h3" /></g>),
  },
  {
    key: 'shark', label: 'Shark',
    node: (<g {...S}><path d="M3 18c5 0 8-3 9-14 2 5 6 9 9 14z" /><path d="M2 21.5c2.2 0 2.2-1 4.5-1s2.3 1 4.5 1 2.3-1 4.5-1 2.3 1 4.5 1" /></g>),
  },
  {
    key: 'rocket', label: 'Rocket',
    node: (<g {...S}><path d="M12 2.5c3.2 2 5 5.2 5 9.5l-2 3.5H9L7 12c0-4.3 1.8-7.5 5-9.5z" /><circle cx="12" cy="9.5" r="1.6" /><path d="M9 15.5l-3.2 3M15 15.5l3.2 3M12 17v4" /></g>),
  },
  {
    key: 'flame', label: 'Flame',
    node: (<g {...S}><path d="M12 2.5c.8 3.2 5.5 5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.2 1-3.5 2.2-4.5.1 2 1 3 2.3 3.2C11.5 8.5 10.3 6 12 2.5z" /></g>),
  },
  {
    key: 'diamond', label: 'Diamond',
    node: (<g {...S}><path d="M6.5 4h11l4 6L12 21 2.5 10z" /><path d="M2.5 10h19M9.5 4L8 10l4 11 4-11-1.5-6" /></g>),
  },
  {
    key: 'crown', label: 'Crown',
    node: (<g {...S}><path d="M3 8l4.2 4L12 5l4.8 7L21 8l-2 11H5z" /><path d="M5.5 19h13" /></g>),
  },
  {
    key: 'bolt', label: 'Bolt',
    node: (<g {...S}><path d="M13.5 2L4.5 14H11l-1 8 9-12h-6.5z" /></g>),
  },
  {
    key: 'skull', label: 'Skull',
    node: (<g {...S}><path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z" /><circle cx="9" cy="11.5" r="1.4" /><circle cx="15" cy="11.5" r="1.4" /><path d="M12 14.5v1.5M10 20v-2M14 20v-2" /></g>),
  },
  {
    key: 'ghost', label: 'Ghost',
    node: (<g {...S}><path d="M5 21V11a7 7 0 0 1 14 0v10l-2.3-1.8L14.3 21 12 19.2 9.7 21l-2.4-1.8z" /><path d="M9.5 11h.01M14.5 11h.01" /></g>),
  },
  {
    key: 'shuriken', label: 'Shuriken',
    node: (<g {...S}><path d="M12 2.5l2.6 6.9L21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6z" /><circle cx="12" cy="12" r="1.6" /></g>),
  },
  {
    key: 'moon', label: 'Moon',
    node: (<g {...S}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /><path d="M16.5 4.5v3M15 6h3" /></g>),
  },
  {
    key: 'target', label: 'Target',
    node: (<g {...S}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" /></g>),
  },
  {
    key: 'shield', label: 'Shield',
    node: (<g {...S}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></g>),
  },
  {
    key: 'candles', label: 'Candles',
    node: (<g {...S}><path d="M7 3.5v3M7 16.5v4M5 6.5h4v10H5z" /><path d="M17 2.5v3M17 14.5v5M15 5.5h4v9h-4z" /></g>),
  },
];

export function iconNode(key) {
  return (AVATAR_ICONS.find((i) => i.key === key) || AVATAR_ICONS[0]).node;
}

export function AvatarGlyph({ name, size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {iconNode(name)}
    </svg>
  );
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
