'use client';

function Svg({ size = 18, className = '', children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Soft tinted fill used behind the outline so icons read as "duotone"
const TINT = { fill: 'currentColor', fillOpacity: 0.16 };

// Candlesticks — also used as the "Trades" tab icon (ListGlyph alias below)
export const CandlesGlyph = (p) => (
  <Svg {...p}>
    <path d="M7 3v3M7 14v4M17 5v3M17 17v3" />
    <rect x="4.5" y="6" width="5" height="8" rx="1.3" {...TINT} />
    <rect x="14.5" y="8" width="5" height="9" rx="1.3" {...TINT} />
  </Svg>
);
export const ListGlyph = CandlesGlyph;

export const PlusGlyph = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" {...TINT} />
    <path d="M12 8v8M8 12h8" />
  </Svg>
);

export const NoteGlyph = (p) => (
  <Svg {...p}>
    <path d="M6 3h9l4 4v14H6z" {...TINT} />
    <path d="M15 3v4h4M9.5 12h6M9.5 16h3.5" />
  </Svg>
);

export const ImageGlyph = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3.5" {...TINT} />
    <circle cx="9" cy="9.5" r="1.7" />
    <path d="M3.5 17l5.5-5 4 4 2.5-2.5 5 4.5" />
  </Svg>
);

export const CameraGlyph = (p) => (
  <Svg {...p}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" {...TINT} />
    <circle cx="12" cy="13" r="3.2" />
  </Svg>
);

export const ChevronLeftGlyph = (p) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const ChevronRightGlyph = (p) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const CloseGlyph = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const ArrowLeftGlyph = (p) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);

export const SparkleGlyph = (p) => (
  <Svg {...p}>
    <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z" {...TINT} />
    <path d="M19 15v4M17 17h4" />
  </Svg>
);

export const TargetGlyph = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" {...TINT} />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </Svg>
);

export const TrendUpGlyph = (p) => (
  <Svg {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Svg>
);

export const TrendDownGlyph = (p) => (
  <Svg {...p}>
    <path d="M3 7l6 6 4-4 8 8" />
    <path d="M15 17h6v-6" />
  </Svg>
);
