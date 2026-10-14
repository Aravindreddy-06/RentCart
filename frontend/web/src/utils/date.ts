/**
 * src/utils/date.ts
 * Date and time formatting utility for India defaults:
 * - Dates shown as dd/MM/yyyy
 * - Times in 12-hour format with the browser timezone
 */

/**
 * Formats a date string or Date object as dd/MM/yyyy.
 * Handles "YYYY-MM-DD" date-only strings without timezone shift.
 */
export function formatDateDMY(dateInput?: string | Date | null): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [year, month, day] = dateInput.trim().split('-');
    return `${day}/${month}/${year}`;
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a time in 12-hour format (e.g. "2:30 pm").
 */
export function formatTime12(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats combined date and time: dd/MM/yyyy, hh:mm a.
 */
export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  return `${formatDateDMY(d)}, ${formatTime12(d)}`;
}
