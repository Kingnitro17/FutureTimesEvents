/**
 * Date formatting utilities for Future Times Events
 * Handles various date formats from Supabase and prevents "Invalid Date" errors
 */

export function formatEventDate(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return 'Date to be announced';

  try {
    // Handle separate date and time fields (legacy format)
    if (timeStr) {
      const dateTimeStr = `${dateStr}T${timeStr}`;
      const date = new Date(dateTimeStr);
      
      if (isNaN(date.getTime())) {
        return 'Date to be announced';
      }

      return new Intl.DateTimeFormat('en-ZW', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Harare',
      }).format(date);
    }

    // Handle ISO timestamp format
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return 'Date to be announced';
    }

    return new Intl.DateTimeFormat('en-ZW', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Africa/Harare',
    }).format(date);
  } catch {
    return 'Date to be announced';
  }
}

export function formatEventTime(timeStr?: string | null): string {
  if (!timeStr) return 'Time to be announced';

  try {
    // Handle HH:MM:SS format
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
    }

    // Handle ISO timestamp
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      return 'Time to be announced';
    }

    return new Intl.DateTimeFormat('en-ZW', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Harare',
    }).format(date);
  } catch {
    return 'Time to be announced';
  }
}

export function formatEventDateTimeRange(
  dateStr?: string | null,
  startTimeStr?: string | null,
  endTimeStr?: string | null
): string {
  const date = formatEventDate(dateStr);
  const startTime = formatEventTime(startTimeStr);
  const endTime = formatEventTime(endTimeStr);

  if (date === 'Date to be announced') return date;
  
  if (startTime === 'Time to be announced') {
    return date;
  }

  if (endTime === 'Time to be announced' || endTime === startTime) {
    return `${date} · ${startTime}`;
  }

  return `${date} · ${startTime} – ${endTime}`;
}

export function isValidDate(value?: string | null): boolean {
  if (!value) return false;
  try {
    const date = new Date(value);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}
