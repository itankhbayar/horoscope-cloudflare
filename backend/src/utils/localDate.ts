export function formatLocalDateISO(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getLocalDateISO(timezone: string): string {
  return formatLocalDateISO(new Date(), timezone);
}

export function safeDateISO(timezone?: string): string {
  try {
    return getLocalDateISO(timezone || 'UTC');
  } catch {
    return getLocalDateISO('UTC');
  }
}

export function safeDateISOForDate(date: Date, timezone?: string): string {
  try {
    return formatLocalDateISO(date, timezone || 'UTC');
  } catch {
    return formatLocalDateISO(date, 'UTC');
  }
}
