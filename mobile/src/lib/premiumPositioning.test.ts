import { describe, expect, it } from 'vitest';
import { PREMIUM_POSITIONING_COPY } from './brandCopy';

describe('premium positioning copy', () => {
  it('positions premium around private pattern memory rather than content volume', () => {
    const copy = Object.values(PREMIUM_POSITIONING_COPY).join(' ');

    expect(copy).toMatch(/pattern|memory|private|ritual|timing/i);
    expect(copy).not.toMatch(/unlock more readings|get premium features|exclusive content|hurry|limited/i);
  });

  it('includes trust and privacy boundaries', () => {
    const copy = Object.values(PREMIUM_POSITIONING_COPY).join(' ');

    expect(copy).toMatch(/No diagnosis|No emotional surveillance|No selling birth data/i);
  });
});
