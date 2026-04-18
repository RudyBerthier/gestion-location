import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// On utilise la clé de service Supabase comme clé de chiffrement si CRYPTO_SECRET n'existe pas.
// Il faut absolument 32 caractères pour l'algorithme aes-256-cbc.
const rawKey = process.env.CRYPTO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secret_key_which_needs_32_bytes';
const SECRET_KEY = rawKey.padEnd(32, '0').substring(0, 32);

export function encryptText(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptText(text) {
  if (!text) return text;
  const textParts = text.split(':');
  if (textParts.length !== 2) return text; // Pas chiffré dans le bon format

  try {
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Erreur de déchiffrement :", err);
    return null;
  }
}
