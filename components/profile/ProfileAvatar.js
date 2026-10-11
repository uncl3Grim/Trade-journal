'use client';

import { gradientFor } from '../../lib/profile';
import { AvatarGlyph } from './ProfileIcons';

export default function ProfileAvatar({ icon, gradient, size = 64, ring = false, className = '' }) {
  const g = gradientFor(gradient);
  const inner = (
    <div
      className="pf-avatar-inner flex items-center justify-center text-white shadow-lg"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '28%',
        background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
        boxShadow: `0 10px 30px -10px ${g.from}99`,
      }}
    >
      <AvatarGlyph key={icon} name={icon} size={Math.round(size * 0.5)} className="pf-icon-pop drop-shadow" />
    </div>
  );
  if (!ring) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        {inner}
      </div>
    );
  }
  return (
    <div className={`pf-ring ${className}`} style={{ width: size, height: size, '--g1': g.from, '--g2': g.to }}>
      <div className="pf-ring-gap">{inner}</div>
    </div>
  );
}
