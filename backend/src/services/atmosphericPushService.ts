import type { GlobalSkyToday } from './globalSkyService';

export interface AtmosphericPushCopy {
  title: string;
  body: string;
  reason: 'tension' | 'intimacy' | 'clarity' | 'reflection' | 'socialOpenness';
}

export interface QuietHoursWindow {
  enabled: boolean;
  start: string;
  end: string;
}

function minutes(value: string): number {
  const [hh, mm] = value.split(':').map((part) => Number(part));
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
}

export function isInsideQuietHours(localHHMM: string, quiet: QuietHoursWindow): boolean {
  if (!quiet.enabled) return false;
  const now = minutes(localHHMM);
  const start = minutes(quiet.start);
  const end = minutes(quiet.end);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

export function buildAtmosphericPushCopy(sky: GlobalSkyToday): AtmosphericPushCopy {
  if (sky.atmosphere.tension >= 64) {
    return {
      title: 'Tonight is emotionally direct',
      body: 'The atmosphere favors honesty over avoidance, without forcing a dramatic confession.',
      reason: 'tension',
    };
  }
  if (sky.atmosphere.intimacy >= 64) {
    return {
      title: 'Tonight feels closer than usual',
      body: 'Small shifts in tone may reveal what people are trying to protect.',
      reason: 'intimacy',
    };
  }
  if (sky.atmosphere.clarity >= 64) {
    return {
      title: 'The sky is unusually readable tonight',
      body: 'Direct language lands better than performance.',
      reason: 'clarity',
    };
  }
  if (sky.atmosphere.reflection >= 60) {
    return {
      title: 'Tonight has a review quality',
      body: 'A quieter hour may show you what the day was really asking for.',
      reason: 'reflection',
    };
  }
  return {
    title: 'Tonight favors softer timing',
    body: 'Let the mood arrive without turning it into an assignment.',
    reason: 'socialOpenness',
  };
}
