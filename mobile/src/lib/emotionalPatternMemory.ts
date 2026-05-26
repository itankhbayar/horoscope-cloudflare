import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AtmosphereKey, PersonalSkyLayer, PersonalSkyRitualCard } from '@astralis/lib/types';

export type EmotionalMemoryEventType =
  | 'resonance_viewed'
  | 'ritual_card_opened'
  | 'reflection_saved'
  | 'quiet_hour_enabled'
  | 'relationship_atmosphere_opened';

export type EmotionalMemoryEvent = {
  id: string;
  type: EmotionalMemoryEventType;
  date: string;
  createdAt: string;
  signal: AtmosphereKey;
  moonPhase?: string;
  ritualCardId?: PersonalSkyRitualCard['id'];
  resonanceScore?: number;
};

export type EmotionalArchiveItem = {
  id: string;
  date: string;
  createdAt: string;
  title: string;
  body: string;
  signal: AtmosphereKey;
};

export type EmotionalPatternMemory = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  events: EmotionalMemoryEvent[];
  archive: EmotionalArchiveItem[];
};

export type EmotionalPatternSummary = {
  eventCount: number;
  ritualNights: number;
  strongestSignal: AtmosphereKey | null;
  reflectionCount: number;
  relationshipCount: number;
  quietHourCount: number;
  archiveCount: number;
  insights: string[];
};

const MEMORY_KEY = 'emotional-pattern-memory:v1';
const MAX_EVENTS = 160;
const MAX_ARCHIVE = 40;

function nowISO(): string {
  return new Date().toISOString();
}

function randomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyMemory(): EmotionalPatternMemory {
  const now = nowISO();
  return { version: 1, createdAt: now, updatedAt: now, events: [], archive: [] };
}

function isMemory(value: unknown): value is EmotionalPatternMemory {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EmotionalPatternMemory>;
  return candidate.version === 1 && Array.isArray(candidate.events) && Array.isArray(candidate.archive);
}

async function save(memory: EmotionalPatternMemory): Promise<EmotionalPatternMemory> {
  const next = {
    ...memory,
    updatedAt: nowISO(),
    events: memory.events.slice(-MAX_EVENTS),
    archive: memory.archive.slice(-MAX_ARCHIVE),
  };
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  return next;
}

export async function getEmotionalPatternMemory(): Promise<EmotionalPatternMemory> {
  const raw = await AsyncStorage.getItem(MEMORY_KEY);
  if (!raw) {
    const memory = emptyMemory();
    await save(memory);
    return memory;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isMemory(parsed)) return parsed;
  } catch {
    // Recover from corrupted local memory without leaking or syncing anything.
  }
  const memory = emptyMemory();
  await save(memory);
  return memory;
}

export async function recordEmotionalMemoryEvent(
  event: Omit<EmotionalMemoryEvent, 'id' | 'createdAt'>,
): Promise<EmotionalPatternSummary> {
  const memory = await getEmotionalPatternMemory();
  const next = await save({
    ...memory,
    events: [
      ...memory.events,
      {
        ...event,
        id: randomId(),
        createdAt: nowISO(),
      },
    ],
  });
  return summarizeEmotionalPatternMemory(next);
}

export async function saveReflectionMoment(card: PersonalSkyRitualCard, layer: PersonalSkyLayer): Promise<EmotionalPatternSummary> {
  const memory = await getEmotionalPatternMemory();
  const now = nowISO();
  const next = await save({
    ...memory,
    events: [
      ...memory.events,
      {
        id: randomId(),
        type: 'reflection_saved',
        date: layer.date,
        createdAt: now,
        signal: card.signal,
        moonPhase: layer.sky.moonPhase,
        ritualCardId: card.id,
        resonanceScore: layer.resonanceScore,
      },
    ],
    archive: [
      ...memory.archive,
      {
        id: randomId(),
        date: layer.date,
        createdAt: now,
        title: card.title,
        body: card.body,
        signal: card.signal,
      },
    ],
  });
  return summarizeEmotionalPatternMemory(next);
}

export async function resetEmotionalPatternMemory(): Promise<EmotionalPatternSummary> {
  const memory = emptyMemory();
  await save(memory);
  return summarizeEmotionalPatternMemory(memory);
}

export function emotionalMemoryExplanation(): string {
  return 'Astralis keeps this memory on this device as ritual metadata: dates, sky tones, opened cards, quiet-hour use, and saved reflection moments. It is reflective, not diagnostic, and you can reset it anytime.';
}

export function summarizeEmotionalPatternMemory(memory: EmotionalPatternMemory): EmotionalPatternSummary {
  const recent = memory.events.slice(-60);
  const signalCounts = new Map<AtmosphereKey, number>();
  const nights = new Set<string>();
  let reflectionCount = 0;
  let relationshipCount = 0;
  let quietHourCount = 0;

  for (const event of recent) {
    nights.add(event.date);
    signalCounts.set(event.signal, (signalCounts.get(event.signal) ?? 0) + 1);
    if (event.ritualCardId === 'reflection-prompt' || event.type === 'reflection_saved') reflectionCount += 1;
    if (event.ritualCardId === 'relationship-atmosphere' || event.type === 'relationship_atmosphere_opened') relationshipCount += 1;
    if (event.type === 'quiet_hour_enabled') quietHourCount += 1;
  }

  const strongestSignal = Array.from(signalCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const insights: string[] = [];
  if (strongestSignal && recent.length >= 3) {
    insights.push(`You tend to linger with ${signalLabel(strongestSignal)}-heavy evenings more than other tones.`);
  }
  if (reflectionCount >= 2) {
    insights.push('Your recent rituals suggest you return most easily when the night gives you room to reflect.');
  }
  if (relationshipCount >= 2) {
    insights.push('Relationship atmosphere prompts have been part of your recent rhythm, especially when the sky carries more emotional texture.');
  }
  if (quietHourCount >= 2) {
    insights.push('Quiet-hour moments are becoming part of how you close the day.');
  }
  if (insights.length === 0 && recent.length > 0) {
    insights.push('Your emotional rhythm is still forming. A few more nights will make the pattern easier to read softly.');
  }

  return {
    eventCount: recent.length,
    ritualNights: nights.size,
    strongestSignal,
    reflectionCount,
    relationshipCount,
    quietHourCount,
    archiveCount: memory.archive.length,
    insights,
  };
}

function signalLabel(signal: AtmosphereKey): string {
  return signal.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`);
}
