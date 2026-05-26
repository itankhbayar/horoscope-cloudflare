import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ZodiacSign } from '@astralis/lib/types';

export type GuestOnboardingStage =
  | 'guest_cosmic_energy'
  | 'previews_seen'
  | 'personalization_prompted'
  | 'zodiac_collected'
  | 'birth_date_collected'
  | 'birth_city_collected'
  | 'birth_time_prompted'
  | 'signup_prompted'
  | 'activated';

export type GuestOnboardingState = {
  guestId: string;
  stage: GuestOnboardingStage;
  createdAt: string;
  updatedAt: string;
  firstReadingViewedAt?: string;
  previewCardsSeen?: number;
  preferredSign?: ZodiacSign;
  birthDate?: string;
  birthTimeSkipped?: boolean;
  shareCount?: number;
  ritualDates?: string[];
  linkedUserId?: string;
};

const GUEST_STATE_KEY = 'progressive-onboarding:guest-state:v1';

const STAGE_ORDER: Record<GuestOnboardingStage, number> = {
  guest_cosmic_energy: 0,
  previews_seen: 1,
  personalization_prompted: 2,
  zodiac_collected: 3,
  birth_date_collected: 4,
  birth_city_collected: 5,
  birth_time_prompted: 6,
  signup_prompted: 7,
  activated: 8,
};

function nowISO(): string {
  return new Date().toISOString();
}

function randomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyState(): GuestOnboardingState {
  const now = nowISO();
  return {
    guestId: randomId(),
    stage: 'guest_cosmic_energy',
    createdAt: now,
    updatedAt: now,
    previewCardsSeen: 0,
    shareCount: 0,
    ritualDates: [],
  };
}

function isState(value: unknown): value is GuestOnboardingState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GuestOnboardingState>;
  return typeof candidate.guestId === 'string' && typeof candidate.stage === 'string' && candidate.stage in STAGE_ORDER;
}

export async function getOrCreateGuestOnboardingState(): Promise<GuestOnboardingState> {
  const raw = await AsyncStorage.getItem(GUEST_STATE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isState(parsed)) return parsed;
    } catch {
      // Recover idempotently from corrupted local state.
    }
  }
  const state = emptyState();
  await AsyncStorage.setItem(GUEST_STATE_KEY, JSON.stringify(state));
  return state;
}

export async function updateGuestOnboardingState(
  patch: Partial<Omit<GuestOnboardingState, 'guestId' | 'createdAt'>>,
): Promise<GuestOnboardingState> {
  const current = await getOrCreateGuestOnboardingState();
  const nextStage = patch.stage && STAGE_ORDER[patch.stage] > STAGE_ORDER[current.stage] ? patch.stage : current.stage;
  const next: GuestOnboardingState = {
    ...current,
    ...patch,
    stage: nextStage,
    updatedAt: nowISO(),
  };
  await AsyncStorage.setItem(GUEST_STATE_KEY, JSON.stringify(next));
  return next;
}

export async function markFirstReadingViewed(): Promise<GuestOnboardingState> {
  const current = await getOrCreateGuestOnboardingState();
  if (current.firstReadingViewedAt) return current;
  return updateGuestOnboardingState({
    firstReadingViewedAt: nowISO(),
    stage: 'guest_cosmic_energy',
  });
}

export async function recordPreviewCardsSeen(count: number): Promise<GuestOnboardingState> {
  return updateGuestOnboardingState({
    previewCardsSeen: Math.max(0, count),
    stage: count >= 2 ? 'previews_seen' : 'guest_cosmic_energy',
  });
}

export async function recordGuestShare(): Promise<GuestOnboardingState> {
  const current = await getOrCreateGuestOnboardingState();
  return updateGuestOnboardingState({
    shareCount: (current.shareCount ?? 0) + 1,
  });
}

export async function recordGuestRitual(dateISO: string): Promise<GuestOnboardingState> {
  const current = await getOrCreateGuestOnboardingState();
  const dates = Array.from(new Set([...(current.ritualDates ?? []), dateISO])).slice(-30);
  return updateGuestOnboardingState({ ritualDates: dates });
}

export async function linkGuestToAuthenticatedUser(userId: string): Promise<GuestOnboardingState> {
  return updateGuestOnboardingState({
    linkedUserId: userId,
    stage: 'activated',
  });
}

export async function clearGuestOnboardingState(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_STATE_KEY);
}
