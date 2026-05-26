import { describe, expect, it } from 'vitest';
import {
  formatFreezeSafeguard,
  formatStreakRitual,
  keepStreakAliveCopy,
  longestStreakCopy,
  milestoneCelebration,
  milestoneCopy,
  milestoneExperience,
  milestoneProgress,
  milestoneSharePhrase,
  nextMilestoneFor,
  normalizeStreakFreezeCap,
  normalizeStreakCount,
  normalizeStreakFreezes,
  normalizeStreakSegment,
  segmentCopy,
  shareableMilestoneFor,
} from './streakDisplay';

describe('streak display copy', () => {
  it('formats the home streak chip with soft ritual copy', () => {
    expect(formatStreakRitual(0)).toBeNull();
    expect(formatStreakRitual(1)).toBe('Ritual begun');
    expect(formatStreakRitual(3)).toBe('3 nights aligned');
    expect(formatStreakRitual(7)).toBe('7-day ritual');
  });

  it('falls back safely when older API responses omit streak fields', () => {
    expect(normalizeStreakCount(undefined, 2)).toBe(2);
    expect(normalizeStreakCount(null, 2)).toBe(2);
    expect(normalizeStreakCount(-1, 2)).toBe(2);
    expect(normalizeStreakCount(7.8, 0)).toBe(7);
    expect(normalizeStreakFreezes(undefined)).toBe(0);
    expect(normalizeStreakFreezes(1.8)).toBe(1);
    expect(normalizeStreakFreezeCap(undefined)).toBe(1);
    expect(normalizeStreakSegment(undefined, 30)).toBe('devoted');
  });

  it('shows celebration only when a milestone is present', () => {
    expect(milestoneCelebration(null)).toBe('none');
    expect(milestoneCelebration(3)).toBe('sparkle');
    expect(milestoneCelebration(7)).toBe('glow');
    expect(milestoneCelebration(30)).toBe('cosmic');
    expect(milestoneCopy(7)).toBe('A constellation has opened around your ritual.');
    expect(milestoneCopy(365)).toBe('A full solar return of showing up gently.');
  });

  it('formats freeze, longest, segment, and share copy without guilt language', () => {
    expect(formatFreezeSafeguard(1)).toBe('1 safeguard available');
    expect(formatFreezeSafeguard(2)).toBe('2 safeguards available');
    expect(longestStreakCopy(21)).toBe('Longest rhythm: 21 days');
    expect(milestoneSharePhrase(30)).toBe('My cosmic rhythm is glowing');
    expect(segmentCopy('building', 3)).toBe('Your cosmic rhythm is building.');
    expect(shareableMilestoneFor(31)).toBe(30);
  });

  it('builds progress and milestone experiences without pressure language', () => {
    expect(nextMilestoneFor(30)).toBe(50);
    expect(nextMilestoneFor(364)).toBe(365);
    expect(milestoneProgress(15, 30)).toBeCloseTo(0.0625, 4);
    expect(keepStreakAliveCopy(false, 8)).toBe("Read today's ritual to add this night to your rhythm.");
    expect(keepStreakAliveCopy(true, 8)).toBe('Today is already part of your ritual history.');
    expect(milestoneExperience(365)).toMatchObject({
      title: 'Solar return',
      rewardConcept: 'Annual ritual recap, private archive cover, and commemorative share card.',
    });
  });
});
