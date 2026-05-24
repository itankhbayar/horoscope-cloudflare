export type StreakMilestone = 3 | 7 | 14 | 30 | 50 | 100;

export type StreakCelebration = 'none' | 'sparkle' | 'glow' | 'cosmic';
export type StreakSegment = 'new' | 'building' | 'aligned' | 'devoted' | 'legendary';

export function normalizeStreakCount(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function normalizeStreakFreezes(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function normalizeStreakFreezeCap(value: unknown, fallback = 1): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function streakSegmentFor(count: number): StreakSegment {
  if (count >= 100) return 'legendary';
  if (count >= 30) return 'devoted';
  if (count >= 7) return 'aligned';
  if (count >= 3) return 'building';
  return 'new';
}

export function normalizeStreakSegment(value: unknown, count: number): StreakSegment {
  if (
    value === 'new' ||
    value === 'building' ||
    value === 'aligned' ||
    value === 'devoted' ||
    value === 'legendary'
  ) {
    return value;
  }
  return streakSegmentFor(count);
}

export function formatStreakRitual(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) return '✨ Ritual begun';
  if (count === 3) return '✨ 3 nights aligned';
  return `✨ ${count}-day ritual`;
}

export function formatFreezeSafeguard(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 cosmic safeguard remaining' : `${count} cosmic safeguards remaining`;
}

export function formatFreezeCapacity(count: number, cap: number): string {
  return `${Math.max(0, count)} / ${Math.max(1, cap)} cosmic safeguards`;
}

export function freezeAwardCopy(awarded: boolean | undefined): string | null {
  return awarded ? 'A cosmic safeguard was added.' : null;
}

export function longestStreakCopy(count: number): string {
  return count > 0 ? `Your longest cosmic rhythm: ${count} days ✨` : 'Your longest cosmic rhythm is waiting to begin ✨';
}

export function milestoneCelebration(milestone: StreakMilestone | null | undefined): StreakCelebration {
  if (!milestone) return 'none';
  if (milestone === 3) return 'sparkle';
  if (milestone === 7 || milestone === 14) return 'glow';
  return 'cosmic';
}

export function milestoneCopy(milestone: StreakMilestone | null | undefined): string | null {
  if (!milestone) return null;
  if (milestone === 7) return 'A constellation has opened around your ritual.';
  if (milestone === 30) return 'Thirty nights of cosmic rhythm. Your sky is glowing.';
  if (milestone === 100) return 'A legendary orbit: 100 days under your stars.';
  return `You've kept your cosmic rhythm for ${milestone} days.`;
}

export function milestoneSharePhrase(milestone: StreakMilestone): string {
  if (milestone >= 100) return 'A legendary orbit under my stars';
  if (milestone >= 30) return 'My cosmic rhythm is glowing';
  if (milestone >= 7) return 'A constellation opened around my ritual';
  return 'My daily ritual has begun to sparkle';
}

export function shareableMilestoneFor(count: number): StreakMilestone | null {
  if (count >= 100) return 100;
  if (count >= 50) return 50;
  if (count >= 30) return 30;
  if (count >= 14) return 14;
  if (count >= 7) return 7;
  if (count >= 3) return 3;
  return null;
}

export function segmentCopy(segment: StreakSegment, count: number): string {
  if (segment === 'legendary') return `${count} nights aligned under the same stars \uD83C\uDF19`;
  if (segment === 'devoted') return 'Your ritual history is glowing.';
  if (segment === 'aligned') return `${count} nights aligned under the same stars \uD83C\uDF19`;
  if (segment === 'building') return 'Your cosmic rhythm is building \u2728';
  return 'Your cosmic rhythm continues tonight \u2728';
}
