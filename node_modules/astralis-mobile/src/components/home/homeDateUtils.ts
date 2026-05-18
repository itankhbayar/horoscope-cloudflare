export type HoroscopePeriod = 'yesterday' | 'today' | 'tomorrow' | 'weekly' | 'monthly' | 'annual';

export function localTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const mo = parts[1] ?? 1;
  const da = parts[2] ?? 1;
  return new Date(y, mo - 1, da);
}

export function addCalendarDays(isoDate: string, delta: number): string {
  const d = parseLocalDate(isoDate);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOfWeekContaining(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

function firstOfMonth(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function januaryFirst(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  return `${d.getFullYear()}-01-01`;
}

/** Maps UI period to `YYYY-MM-DD` for `fetchDailyHoroscope(sign, date)`. */
export function horoscopeDateForPeriod(period: HoroscopePeriod): string {
  const today = localTodayISO();
  switch (period) {
    case 'yesterday':
      return addCalendarDays(today, -1);
    case 'today':
      return today;
    case 'tomorrow':
      return addCalendarDays(today, 1);
    case 'weekly':
      return mondayOfWeekContaining(today);
    case 'monthly':
      return firstOfMonth(today);
    case 'annual':
      return januaryFirst(today);
    default:
      return today;
  }
}
