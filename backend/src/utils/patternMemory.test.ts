import { describe, expect, it } from 'vitest';
import {
  buildPatternMemoryBlock,
  detectPatternMemory,
  patternMemoryCopy,
  pruneThemeHistory,
  type ThemeHistoryEntry,
} from './patternMemory';

const TODAY = '2026-06-03';

function entry(theme: ThemeHistoryEntry['theme'], date: string): ThemeHistoryEntry {
  return { theme, date };
}

describe('detectPatternMemory — repeated theme detection', () => {
  it('flags a single recent recurrence with the day distance', () => {
    const memory = detectPatternMemory('recognition', TODAY, [entry('recognition', '2026-06-02')]);
    expect(memory).toEqual({ theme: 'recognition', kind: 'recent', daysAgo: 1, occurrences: 1 });
  });

  it('reports the closest prior occurrence when several days match', () => {
    const memory = detectPatternMemory('restraint', TODAY, [
      entry('restraint', '2026-05-26'), // 8 days ago
      entry('restraint', '2026-05-23'), // 11 days ago
    ]);
    // Two same-theme days, but both older than a week → 'recent' to the closest (8 days ago).
    expect(memory).toEqual({ theme: 'restraint', kind: 'recent', daysAgo: 8, occurrences: 2 });
  });

  it('escalates to "multiple" when the theme recurred 2+ times this week', () => {
    const memory = detectPatternMemory('clarity', TODAY, [
      entry('clarity', '2026-06-02'),
      entry('clarity', '2026-05-30'),
      entry('turning', '2026-06-01'),
    ]);
    expect(memory).toEqual({ theme: 'clarity', kind: 'multiple', daysAgo: null, occurrences: 2 });
  });
});

describe('detectPatternMemory — no memory when insufficient history', () => {
  it('returns null with empty history', () => {
    expect(detectPatternMemory('turning', TODAY, [])).toBeNull();
  });

  it('returns null when no prior day matches today\'s theme', () => {
    const history = [entry('unspoken', '2026-06-02'), entry('clarity', '2026-06-01')];
    expect(detectPatternMemory('turning', TODAY, history)).toBeNull();
  });

  it('ignores today itself (gap of 0) so a first-ever appearance is not a memory', () => {
    expect(detectPatternMemory('recognition', TODAY, [entry('recognition', TODAY)])).toBeNull();
  });
});

describe('history retention window (14 days)', () => {
  it('uses a matching theme exactly 14 days ago', () => {
    const memory = detectPatternMemory('unspoken', TODAY, [entry('unspoken', '2026-05-20')]);
    expect(memory).toEqual({ theme: 'unspoken', kind: 'recent', daysAgo: 14, occurrences: 1 });
  });

  it('ignores a matching theme 15 days ago', () => {
    expect(detectPatternMemory('unspoken', TODAY, [entry('unspoken', '2026-05-19')])).toBeNull();
  });

  it('pruneThemeHistory drops entries outside 1..14 days and future dates', () => {
    const pruned = pruneThemeHistory(
      [
        entry('clarity', '2026-06-04'), // future
        entry('clarity', TODAY), // today
        entry('clarity', '2026-06-02'), // 1 day ago (kept)
        entry('clarity', '2026-05-20'), // 14 days ago (kept)
        entry('clarity', '2026-05-19'), // 15 days ago (dropped)
      ],
      TODAY,
    );
    expect(pruned.map((e) => e.date)).toEqual(['2026-06-02', '2026-05-20']);
  });
});

describe('patternMemoryCopy — soft, certainty-free language', () => {
  const SOFT = /\b(may|might|could)\b/i;

  it('uses "Yesterday\'s theme was ..." for a one-day-ago recurrence', () => {
    const memory = detectPatternMemory('recognition', TODAY, [entry('recognition', '2026-06-02')])!;
    const copy = patternMemoryCopy(memory, 'en');
    expect(copy.title).toBe('Pattern Memory');
    expect(copy.body).toContain("Yesterday's theme was recognition");
    expect(copy.body).toMatch(SOFT);
  });

  it('names the day distance for an older recurrence', () => {
    const memory = detectPatternMemory('restraint', TODAY, [entry('restraint', '2026-05-31')])!;
    const copy = patternMemoryCopy(memory, 'en');
    expect(copy.body).toContain('3 days ago, restraint appeared');
    expect(copy.body).toMatch(SOFT);
  });

  it('uses the "more than once this week" line for multiple recurrences', () => {
    const memory = detectPatternMemory('clarity', TODAY, [
      entry('clarity', '2026-06-02'),
      entry('clarity', '2026-05-30'),
    ])!;
    const copy = patternMemoryCopy(memory, 'en');
    expect(copy.body).toContain('more than once this week');
    expect(copy.body).toMatch(SOFT);
  });

  it('never includes medical / financial / mental-health claim words', () => {
    const memories = [
      detectPatternMemory('recognition', TODAY, [entry('recognition', '2026-06-02')])!,
      detectPatternMemory('clarity', TODAY, [
        entry('clarity', '2026-06-02'),
        entry('clarity', '2026-05-30'),
      ])!,
    ];
    const banned = /\b(diagnos\w*|depress\w*|anxiety|money|invest\w*|stock|profit|cure|treat\w*|disease)\b/i;
    for (const lang of ['en', 'mn'] as const) {
      for (const memory of memories) {
        expect(patternMemoryCopy(memory, lang).body).not.toMatch(banned);
      }
    }
  });
});

describe('buildPatternMemoryBlock', () => {
  it('returns null when there is no memory', () => {
    expect(buildPatternMemoryBlock('turning', TODAY, [], 'en')).toBeNull();
  });

  it('merges detection with copy', () => {
    const block = buildPatternMemoryBlock('recognition', TODAY, [entry('recognition', '2026-06-02')], 'en');
    expect(block).toMatchObject({
      theme: 'recognition',
      kind: 'recent',
      daysAgo: 1,
      title: 'Pattern Memory',
    });
    expect(block?.body).toContain('recognition');
  });
});
