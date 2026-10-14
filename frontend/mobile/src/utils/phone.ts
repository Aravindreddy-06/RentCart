/**
 * src/utils/phone.ts
 * Phone utility functions for display formatting and input sanitization on mobile.
 */

/**
 * Formats a phone number for display.
 * Displays Indian numbers as "+91 98765 43210".
 */
export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s-]/g, '');

  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }

  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  return phone;
}

/**
 * Strips spaces, dashes, parentheses, dots and a leading 0, 91, or +91 on paste,
 * returning up to 10 numeric digits.
 */
export function cleanIndianPhoneInput(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/[\s\-\(\)\.]+/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('091')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.length > 10 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  return cleaned.replace(/\D/g, '').slice(0, 10);
}

/**
 * Checks whether a phone number is an Indian mobile number (+91 followed by 10 digits or 10 digits starting with 6-9).
 */
export function isIndianPhoneNumber(phone?: string | null): boolean {
  if (!phone) return true; // Default to Indian if empty
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+91')) {
    return /^\+91[6-9]\d{9}$/.test(cleaned);
  }
  if (!cleaned.startsWith('+')) {
    return /^[6-9]\d{9}$/.test(cleaned);
  }
  return false;
}

/**
 * Returns 10 digits without prefix if the number is Indian (+91).
 */
export function getIndianPhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+91')) {
    return cleaned.slice(3);
  }
  if (!cleaned.startsWith('+')) {
    return cleaned.slice(0, 10);
  }
  return cleaned;
}
