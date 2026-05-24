import { describe, expect, it } from 'vitest';
import {
  formatFreezeSafeguard,
  formatStreakRitual,
  longestStreakCopy,
  milestoneCelebration,
  milestoneCopy,
  milestoneSharePhrase,
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
    expect(formatStreakRitual(1)).toBe('\u2728 Ritual begun');
    expect(formatStreakRitual(3)).toBe('\u2728 3 nights aligned');
    expect(formatStreakRitual(7)).toBe('\u2728 7-day ritual');
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
  });

  it('formats freeze, longest, segment, and share copy without guilt language', () => {
    expect(formatFreezeSafeguard(1)).toBe('1 cosmic safeguard remaining');
    expect(formatFreezeSafeguard(2)).toBe('2 cosmic safeguards remaining');
    expect(longestStreakCopy(21)).toBe('Your longest cosmic rhythm: 21 days \u2728');
    expect(milestoneSharePhrase(30)).toBe('My cosmic rhythm is glowing');
    expect(segmentCopy('building', 3)).toBe('Your cosmic rhythm is building \u2728');
    expect(shareableMilestoneFor(31)).toBe(30);
  });
});
