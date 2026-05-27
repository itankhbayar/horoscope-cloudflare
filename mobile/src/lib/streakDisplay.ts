import { translate as t } from '../i18n';

export type StreakMilestone = 3 | 7 | 14 | 30 | 50 | 100 | 365;

export type StreakCelebration = 'none' | 'sparkle' | 'glow' | 'cosmic';
export type StreakSegment = 'new' | 'building' | 'aligned' | 'devoted' | 'legendary';

const MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;

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
  if (count === 1) return t('streak.startToday');
  if (count === 3) return t('streak.nights', { count: 3 });
  return t('streak.nights', { count });
}

export function formatFreezeSafeguard(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? t('streak.safeguardOne') : t('streak.safeguardsMany', { count });
}

export function formatFreezeCapacity(count: number, cap: number): string {
  return t('streak.capacity', { count: Math.max(0, count), cap: Math.max(1, cap) });
}

export function freezeAwardCopy(awarded: boolean | undefined): string | null {
  return awarded ? t('streak.awarded') : null;
}

export function longestStreakCopy(count: number): string {
  return count > 0 ? t('streak.longestValue', { count }) : t('streak.longestEmpty');
}

export function milestoneCelebration(milestone: StreakMilestone | null | undefined): StreakCelebration {
  if (!milestone) return 'none';
  if (milestone === 3) return 'sparkle';
  if (milestone === 7 || milestone === 14) return 'glow';
  return 'cosmic';
}

export function milestoneCopy(milestone: StreakMilestone | null | undefined): string | null {
  if (!milestone) return null;
  if (milestone === 7) return t('streak.milestone7');
  if (milestone === 30) return t('streak.milestone30');
  if (milestone === 100) return t('streak.milestone100');
  if (milestone === 365) return t('streak.milestone365');
  return t('streak.milestoneGeneric', { count: milestone });
}

export function milestoneSharePhrase(milestone: StreakMilestone): string {
  if (milestone >= 365) return 'A full solar return of nightly ritual';
  if (milestone >= 100) return 'A deep orbit under my stars';
  if (milestone >= 30) return 'My cosmic rhythm is glowing';
  if (milestone >= 7) return 'A constellation opened around my ritual';
  return 'My daily ritual has begun to sparkle';
}

export function shareableMilestoneFor(count: number): StreakMilestone | null {
  if (count >= 365) return 365;
  if (count >= 100) return 100;
  if (count >= 50) return 50;
  if (count >= 30) return 30;
  if (count >= 14) return 14;
  if (count >= 7) return 7;
  if (count >= 3) return 3;
  return null;
}

export function segmentCopy(segment: StreakSegment, count: number): string {
  if (segment === 'legendary') return t('streak.segmentLegendary', { count });
  if (segment === 'devoted') return t('streak.segmentDevoted');
  if (segment === 'aligned') return t('streak.segmentAligned', { count });
  if (segment === 'building') return t('streak.segmentBuilding');
  return t('streak.segmentNew');
}

export type StreakMilestoneExperience = {
  title: string;
  copy: string;
  animationConcept: string;
  rewardConcept: string;
};

export function nextMilestoneFor(count: number): StreakMilestone | null {
  return MILESTONES.find((milestone) => milestone > count) ?? null;
}

export function previousMilestoneFor(count: number): number {
  const reached = [0, ...MILESTONES].filter((milestone) => milestone <= count);
  return reached[reached.length - 1] ?? 0;
}

export function milestoneProgress(count: number, next: StreakMilestone | null = nextMilestoneFor(count)): number {
  if (!next) return 1;
  const previous = previousMilestoneFor(count);
  const span = Math.max(1, next - previous);
  return Math.max(0, Math.min(1, (count - previous) / span));
}

export function keepStreakAliveCopy(completedToday: boolean, count: number): string {
  if (completedToday) return t('streak.todayDone');
  if (count <= 0) return t('streak.startToday');
  return t('streak.addToday');
}

export function milestoneExperience(milestone: StreakMilestone): StreakMilestoneExperience {
  if (milestone === 7) {
    return {
      title: t('streak.firstConstellation'),
      copy: 'Seven nights is enough to feel a pattern beginning to form.',
      animationConcept: 'Three soft stars connect into a small constellation above the streak number.',
      rewardConcept: 'Shareable constellation card and one added freeze safeguard.',
    };
  }
  if (milestone === 30) {
    return {
      title: t('streak.moonCycle'),
      copy: 'Thirty nights turns the ritual from curiosity into a quiet place to return.',
      animationConcept: 'A slow lunar ring fills once around the card.',
      rewardConcept: 'Private archive emphasis and one added freeze safeguard.',
    };
  }
  if (milestone === 100) {
    return {
      title: t('streak.deepOrbit'),
      copy: 'One hundred nights marks a real emotional rhythm, not a badge to chase.',
      animationConcept: 'A calm orbital path crosses behind the streak card.',
      rewardConcept: 'Premium-style long-horizon summary teaser and share card.',
    };
  }
  if (milestone === 365) {
    return {
      title: t('streak.solarReturn'),
      copy: 'A full year of returning to the sky deserves a quiet, permanent marker.',
      animationConcept: 'A solar halo rises behind the yearly streak number.',
      rewardConcept: 'Annual ritual recap, private archive cover, and commemorative share card.',
    };
  }
  return {
    title: t('streak.rhythmTitle', { count: milestone }),
    copy: 'A small rhythm is becoming visible.',
    animationConcept: 'A restrained shimmer passes once across the progress line.',
    rewardConcept: 'Soft acknowledgement and optional share card.',
  };
}
