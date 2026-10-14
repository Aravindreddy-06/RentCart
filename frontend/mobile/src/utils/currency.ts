/**
 * src/utils/currency.ts
 * Shared currency formatter for INR (Indian Rupee) on mobile.
 */

export interface FormatINROptions {
  showPaise?: boolean;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

function formatIndianGrouping(num: number, hasPaise: boolean): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const fixed = hasPaise ? absNum.toFixed(2) : Math.round(absNum).toString();
  const [intPart, decPart] = fixed.split('.');

  let lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formatted = decPart !== undefined ? `${res}.${decPart}` : res;
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Formats a given amount into Indian Rupee (INR) currency format.
 * - Uses Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
 * - Shows decimals (paise) only when the amount has paise.
 * - Handles null, undefined, NaN, and string numbers safely.
 * - Falls back to Indian digit grouping (12,34,567) and ₹ symbol if Intl en-IN is unavailable on Android (Hermes).
 */
export function formatINR(
  amount: number | string | null | undefined,
  options?: FormatINROptions,
): string {
  if (amount === null || amount === undefined) {
    return '₹0';
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return '₹0';
  }

  const hasPaise = options?.showPaise || (num % 1 !== 0);
  const maxDigits = options?.maximumFractionDigits ?? (hasPaise ? 2 : 0);
  const minDigits = options?.minimumFractionDigits ?? (hasPaise ? 2 : 0);

  try {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: maxDigits,
        minimumFractionDigits: minDigits,
      }).format(num);

      // On Android Hermes, Intl en-IN might produce "INR " or default to USD
      if (formatted.includes('₹')) {
        return formatted;
      }
    }
  } catch {
    // Fall back to manual Indian digit grouping
  }

  return formatIndianGrouping(num, hasPaise);
}
