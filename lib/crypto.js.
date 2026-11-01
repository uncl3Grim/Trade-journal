import crypto from 'crypto';

// Encrypts/decrypts short secrets (like a MyFXBook password) with AES-256-GCM.
// The key lives ONLY in the ENCRYPTION_KEY env var (64 hex characters), never
// in the database, so a database leak alone does not expose the passwords.
const PREFIX = 'enc:v1:';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('ENCRYPTION_KEY is missing or invalid (needs 64 hex characters).');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

// Old rows saved before this fix are plain text. Those are returned as-is so
// they keep working, and the sync route re-saves them encrypted.
export function decryptSecret(value) {
  if (!isEncrypted(value)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
