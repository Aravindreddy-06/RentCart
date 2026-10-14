/**
 * src/utils/date.ts
 * Date and time formatting utilities localized for India (dd/MM/yyyy, 12-hour).
 */

/**
 * Formats a date string, timestamp, or Date object into dd/MM/yyyy.
 */
export function formatDateDMY(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(date.getTime())) {
    // If it's already in YYYY-MM-DD format
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return `${day}/${month}/${year}`;
    }
    return String(dateInput);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats a date string, timestamp, or Date object into 12-hour time (e.g. 2:30 PM).
 */
export function formatTime12(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour should be 12

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats date and time: dd/MM/yyyy, hh:mm a.
 */
export function formatDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  return `${formatDateDMY(dateInput)}, ${formatTime12(dateInput)}`;
}
