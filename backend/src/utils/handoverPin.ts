/**
 * src/utils/handoverPin.ts
 * Cryptographic helpers for Handover PINs:
 * - 4-digit PIN generation (0000-9999, zero-padded)
 * - HMAC-SHA256 hashing with server secret
 * - AES-256-GCM encryption & decryption
 * - Constant-time comparison
 */

import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Ensures a 32-byte Buffer from the configured HANDOVER_PIN_ENC_KEY.
 * If the key is not 64 hex chars, it hashes it using SHA-256 to guarantee 32 bytes.
 */
function getEncryptionKeyBuffer(): Buffer {
  const hexKey = env.HANDOVER_PIN_ENC_KEY || '';
  if (/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    return Buffer.from(hexKey, 'hex');
  }
  // Fallback to SHA-256 digest to guarantee 32 bytes
  return crypto.createHash('sha256').update(hexKey || 'fallback_handover_pin_enc_key').digest();
}

/**
 * Generate a 4-digit numeric PIN (0000-9999), zero-padded.
 */
export function generateHandoverPin(): string {
  const pinNum = crypto.randomInt(0, 10000);
  return pinNum.toString().padStart(4, '0');
}

/**
 * Hash PIN using HMAC-SHA256 with the server secret from HANDOVER_PIN_SECRET.
 */
export function hashHandoverPin(pin: string): string {
  const secret = env.HANDOVER_PIN_SECRET || 'rentcart-super-secret-handover-pin-secret-key-32b';
  return crypto.createHmac('sha256', secret).update(pin).digest('hex');
}

/**
 * Encrypt the 4-digit PIN using AES-256-GCM.
 * Output format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
 */
export function encryptHandoverPin(pin: string): string {
  const key = getEncryptionKeyBuffer();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(pin, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt the encrypted PIN using AES-256-GCM.
 */
export function decryptHandoverPin(encryptedStr: string): string {
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted PIN format');
  }

  const [ivHex, tagHex, dataHex] = parts;
  const key = getEncryptionKeyBuffer();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Constant-time comparison between a candidate PIN and the stored HMAC-SHA256 hash.
 */
export function verifyPinConstantTime(candidatePin: string, storedHash: string): boolean {
  if (!candidatePin || !storedHash) return false;
  const candidateHash = hashHandoverPin(candidatePin);

  const bufCandidate = Buffer.from(candidateHash, 'hex');
  const bufStored = Buffer.from(storedHash, 'hex');

  if (bufCandidate.length !== bufStored.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufCandidate, bufStored);
}
