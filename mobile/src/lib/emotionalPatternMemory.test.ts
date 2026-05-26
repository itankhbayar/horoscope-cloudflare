import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emotionalMemoryExplanation,
  getEmotionalPatternMemory,
  recordEmotionalMemoryEvent,
  resetEmotionalPatternMemory,
  saveReflectionMoment,
} from './emotionalPatternMemory';
import type { PersonalSkyLayer, PersonalSkyRitualCard } from '@astralis/lib/types';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

const layer: PersonalSkyLayer = {
  date: '2026-05-25',
  sign: 'scorpio',
  personalization: 'zodiac_sign',
  resonanceScore: 82,
  headline: 'Scorpio resonance for tonight',
  howTonightAffectsYou: 'Scorpio placements may feel tonight personally.',
  emotionalWeather: 'Reflective weather.',
  relationshipAtmosphere: 'Relationship tone.',
  reflectionPrompt: 'What are you naming?',
  dreamSleepTone: 'Quiet sleep tone.',
  quietHourSuggestion: 'Lower inputs.',
  premiumBridge: 'Deeper timing later.',
  ritualCards: [],
  sky: {
    date: '2026-05-25',
    moonSign: 'scorpio',
    moonPhase: 'Waxing Gibbous',
    atmosphere: {
      tension: 62,
      intimacy: 75,
      clarity: 44,
      momentum: 38,
      uncertainty: 55,
      reflection: 70,
      socialOpenness: 32,
      emotionalVolatility: 68,
    },
    majorAspects: [],
  },
};

const reflectionCard: PersonalSkyRitualCard = {
  id: 'reflection-prompt',
  title: 'Reflection prompt',
  body: 'What truth are you softening before you say it?',
  signal: 'reflection',
};

describe('emotional pattern memory', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('stores privacy-safe ritual metadata and no account identifiers', async () => {
    await recordEmotionalMemoryEvent({
      type: 'resonance_viewed',
      date: '2026-05-25',
      signal: 'reflection',
      moonPhase: 'Waxing Gibbous',
      resonanceScore: 82,
    });

    const raw = JSON.stringify(await getEmotionalPatternMemory());
    expect(raw).not.toMatch(/email|userId|birthCity|birthTime|latitude|longitude/i);
  });

  it('generates reflective pattern insights without diagnostic language', async () => {
    await recordEmotionalMemoryEvent({ type: 'ritual_card_opened', date: '2026-05-23', signal: 'reflection', ritualCardId: 'reflection-prompt' });
    await recordEmotionalMemoryEvent({ type: 'ritual_card_opened', date: '2026-05-24', signal: 'reflection', ritualCardId: 'reflection-prompt' });
    const summary = await recordEmotionalMemoryEvent({ type: 'quiet_hour_enabled', date: '2026-05-25', signal: 'reflection' });

    expect(summary.insights.join(' ')).toMatch(/linger|reflect|forming|Quiet-hour/i);
    expect(summary.insights.join(' ')).not.toMatch(/diagnos|anxiety|depression|you are|we know/i);
  });

  it('archives reflection moments locally and can reset memory', async () => {
    const summary = await saveReflectionMoment(reflectionCard, layer);
    expect(summary.archiveCount).toBe(1);

    const reset = await resetEmotionalPatternMemory();
    expect(reset.eventCount).toBe(0);
    expect(reset.archiveCount).toBe(0);
  });

  it('explains memory boundaries plainly', () => {
    expect(emotionalMemoryExplanation()).toMatch(/on this device/i);
    expect(emotionalMemoryExplanation()).toMatch(/not diagnostic/i);
  });
});
