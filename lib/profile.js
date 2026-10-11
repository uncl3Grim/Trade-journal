export const GRADIENTS = [
  { key: 'aurora',  label: 'Aurora',  from: '#6366f1', to: '#22d3ee' },
  { key: 'sunset',  label: 'Sunset',  from: '#f97316', to: '#ec4899' },
  { key: 'ocean',   label: 'Ocean',   from: '#0ea5e9', to: '#4f46e5' },
  { key: 'ember',   label: 'Ember',   from: '#ef4444', to: '#f59e0b' },
  { key: 'mint',    label: 'Mint',    from: '#10b981', to: '#a3e635' },
  { key: 'orchid',  label: 'Orchid',  from: '#a855f7', to: '#ec4899' },
  { key: 'gold',    label: 'Gold',    from: '#f59e0b', to: '#fde047' },
  { key: 'crimson', label: 'Crimson', from: '#be123c', to: '#7c3aed' },
  { key: 'neon',    label: 'Neon',    from: '#22d3ee', to: '#a3e635' },
  { key: 'mono',    label: 'Mono',    from: '#525252', to: '#d4d4d4' },
];

export function gradientFor(key) {
  return GRADIENTS.find((g) => g.key === key) || GRADIENTS[0];
}

export const TRADING_STYLES = ['Scalper', 'Day trader', 'Swing trader', 'Position trader'];

export const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'mod', 'moderator',
  'system', 'staff', 'official', 'null', 'undefined', 'me', 'you', 'api',
]);

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function validateUsername(raw) {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return 'Pick a username.';
  if (v.length < 3) return 'At least 3 characters.';
  if (v.length > 20) return 'Max 20 characters.';
  if (!/^[a-z0-9_]+$/.test(v)) return 'Only letters, numbers and underscores.';
  if (/^_|_$/.test(v)) return "Can't start or end with an underscore.";
  if (RESERVED_USERNAMES.has(v)) return 'That name is reserved.';
  return '';
}

const ADJ = ['neon', 'silent', 'lucky', 'rogue', 'crimson', 'lunar', 'swift', 'iron', 'cosmic', 'frost', 'wild', 'golden', 'shadow', 'turbo', 'atomic'];
const NOUN = ['bull', 'wolf', 'shark', 'falcon', 'ronin', 'sniper', 'viper', 'comet', 'titan', 'ghost', 'raven', 'fox', 'whale', 'phoenix', 'drifter'];

export function randomUsername() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}_${n}${num}`.slice(0, 20);
}

export function suggestAlternatives(name) {
  const base = (name || 'trader').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'trader';
  const rnd = () => Math.floor(Math.random() * 900) + 100;
  return [`${base}${rnd()}`, `${base}_fx`, `the_${base}`.slice(0, 20)].map((s) => s.slice(0, 20));
}

export function isMissingTable(error) {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(error.message || '');
}
