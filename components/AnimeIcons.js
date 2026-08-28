'use client';

export function JournalGlyph({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 4.5C4 3.67 4.67 3 5.5 3H12V21H5.5C4.67 21 4 20.33 4 19.5V4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M20 4.5C20 3.67 19.33 3 18.5 3H12V21H18.5C19.33 21 20 20.33 20 19.5V4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 7.5H9.5M7 10.5H9.5M14.5 7.5H17M14.5 10.5H17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2.5 6.5L3.4 5.6M2.2 9L3.5 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function TradesGlyph({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 17L9 11L13 15L21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6H21V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 20H21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <circle cx="20" cy="4" r="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function BrokerGlyph({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="9" width="7" height="7" rx="2" transform="rotate(-15 6.5 12.5)" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="8" width="7" height="7" rx="2" transform="rotate(15 17.5 11.5)" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 12L14 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 5L5 6M20 5L19 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function ProfileGlyph({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 12C14.4853 12 16.5 9.98528 16.5 7.5C16.5 5.01472 14.4853 3 12 3C9.51472 3 7.5 5.01472 7.5 7.5C7.5 9.98528 9.51472 12 12 12Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20.5C4 16.9101 7.58172 14 12 14C16.4183 14 20 16.9101 20 20.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 7L9.7 6.3M15.6 6.3L16.3 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
