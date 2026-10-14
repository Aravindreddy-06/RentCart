/**
 * src/utils/phone.ts
 * Phone number utility using libphonenumber-js with default region "IN".
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';

export class PhoneValidationError extends Error {
  statusCode = 400;

  constructor(message = 'Enter a valid 10-digit Indian mobile number') {
    super(message);
    this.name = 'PhoneValidationError';
  }
}

/**
 * Normalizes phone numbers to E.164.
 *
 * Requirements:
 * - Accepts "9876543210", "09876543210", "+91 98765 43210", "91-9876543210" -> "+919876543210".
 * - Returns null for empty or undefined input.
 * - Valid Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9.
 *   Reject everything else with a clear 400 message: "Enter a valid 10-digit Indian mobile number".
 * - Allow a valid international number only if it starts with a '+' and passes libphonenumber validation.
 */
export function normalizePhone(input?: string | null): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // 1. If it starts with '+', it may be an Indian number (+91) or an international number
  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed, 'IN');
    if (!parsed) {
      throw new PhoneValidationError('Enter a valid 10-digit Indian mobile number');
    }

    if (parsed.country === 'IN') {
      const national = parsed.nationalNumber;
      if (/^[6-9]\d{9}$/.test(national)) {
        return parsed.format('E.164');
      }
      throw new PhoneValidationError('Enter a valid 10-digit Indian mobile number');
    }

    // Non-Indian international number: must be valid according to libphonenumber
    if (parsed.isValid()) {
      return parsed.format('E.164');
    }

    throw new PhoneValidationError('Enter a valid 10-digit Indian mobile number');
  }

  // 2. Does not start with '+'. Treat as Indian number with default region "IN"
  const parsed = parsePhoneNumberFromString(trimmed, 'IN');
  if (!parsed || parsed.country !== 'IN') {
    throw new PhoneValidationError('Enter a valid 10-digit Indian mobile number');
  }

  const national = parsed.nationalNumber;
  if (!/^[6-9]\d{9}$/.test(national)) {
    throw new PhoneValidationError('Enter a valid 10-digit Indian mobile number');
  }

  return parsed.format('E.164');
}
