import { describe, expect, it } from 'vitest';
import { decideJobOutcome, summarizeSend, type SendSummary } from './notificationQueueService';
import type { ExpoPushTicket } from './expoPushClient';

describe('summarizeSend', () => {
  it('collects receipts for delivered tokens', () => {
    const tokens = ['ExponentPushToken[a]', 'ExponentPushToken[b]'];
    const tickets: ExpoPushTicket[] = [
      { status: 'ok', id: 'r1' },
      { status: 'ok', id: 'r2' },
    ];
    const summary = summarizeSend(tokens, tickets);
    expect(summary.okReceipts).toEqual([
      { ticketId: 'r1', token: 'ExponentPushToken[a]' },
      { ticketId: 'r2', token: 'ExponentPushToken[b]' },
    ]);
    expect(summary.invalidTokens).toEqual([]);
    expect(summary.retriable).toBe(false);
  });

  it('flags dead tokens for cleanup without blocking other deliveries', () => {
    const tokens = ['ExponentPushToken[a]', 'ExponentPushToken[dead]'];
    const tickets: ExpoPushTicket[] = [
      { status: 'ok', id: 'r1' },
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
    ];
    const summary = summarizeSend(tokens, tickets);
    expect(summary.okReceipts).toEqual([{ ticketId: 'r1', token: 'ExponentPushToken[a]' }]);
    expect(summary.invalidTokens).toEqual(['ExponentPushToken[dead]']);
  });

  it('marks transient errors retriable and records error detail', () => {
    const summary = summarizeSend(
      ['ExponentPushToken[a]'],
      [{ status: 'error', details: { error: 'MessageRateExceeded' } }],
    );
    expect(summary.retriable).toBe(true);
    expect(summary.okReceipts).toEqual([]);
    expect(summary.errorSummary).toContain('MessageRateExceeded');
  });
});

describe('decideJobOutcome', () => {
  const sent: SendSummary = { okReceipts: [{ ticketId: 'r1', token: 't' }], invalidTokens: [], retriable: false, errorSummary: null };
  const retriable: SendSummary = { okReceipts: [], invalidTokens: [], retriable: true, errorSummary: 'x' };
  const dead: SendSummary = { okReceipts: [], invalidTokens: ['t'], retriable: false, errorSummary: 'DeviceNotRegistered' };

  it('is sent when at least one receipt delivered', () => {
    expect(decideJobOutcome(sent, 1, 3)).toBe('sent');
  });

  it('retries transient failures until attempts are exhausted', () => {
    expect(decideJobOutcome(retriable, 1, 3)).toBe('pending');
    expect(decideJobOutcome(retriable, 3, 3)).toBe('failed');
  });

  it('fails terminally when only dead tokens remain', () => {
    expect(decideJobOutcome(dead, 1, 3)).toBe('failed');
  });
});
