// utils/credentialCipher.js
// AES-256-GCM encryption for third-party API credentials stored in the database, so a database
// leak alone does not expose them. The key comes from CREDENTIALS_ENCRYPTION_KEY (64 hex chars)
// when set, otherwise it is derived from JWT_SECRET. Rotating either makes stored credentials
// unreadable, and admins must re-enter them.
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

const getKey = () => {
  const explicit = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (explicit) {
    if (!/^[0-9a-fA-F]{64}$/.test(explicit)) throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters');
    return Buffer.from(explicit, 'hex');
  }
  if (!process.env.JWT_SECRET) throw new Error('No secret available to encrypt credentials');
  return crypto.scryptSync(process.env.JWT_SECRET, 'affiliate-network-credentials', 32);
};

const encryptJson = (value) => {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64')).join('.');
};

const decryptJson = (payload) => {
  const [iv, tag, encrypted] = payload.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
};

module.exports = { encryptJson, decryptJson };
