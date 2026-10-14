/**
 * src/utils/currency.ts
 * Currency formatting utility for backend messages, notifications, and emails.
 */

export function formatINR(amount: number | string | null | undefined): string {
  if (amount == null) return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  const hasPaise = num % 1 !== 0;

  try {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: hasPaise ? 2 : 0,
        minimumFractionDigits: hasPaise ? 2 : 0,
      }).format(num);
    }
  } catch {
    // Fallback below
  }

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
