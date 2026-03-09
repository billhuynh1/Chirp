import crypto from 'node:crypto';
import { requireEnv } from '@/lib/env';

function getKey() {
  const secret = requireEnv('AUTH_SECRET');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptValue(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptValue(value: string) {
  const [ivPart, tagPart, encryptedPart] = value.split(':');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted value');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivPart, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64')),
    decipher.final()
  ]).toString('utf8');
}
