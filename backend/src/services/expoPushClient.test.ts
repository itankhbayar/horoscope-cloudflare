import { describe, expect, it, vi } from 'vitest';
import {
  buildExpoMessages,
  chunk,
  classifyReceipt,
  classifyTicket,
  getExpoPushReceipts,
  sendExpoPushBatch,
} from './expoPushClient';

describe('expo push client helpers', () => {
  it('chunks into bounded batches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow();
  });

  it('builds one message per token with sound and channel', () => {
    const messages = buildExpoMessages(['ExponentPushToken[a]', 'ExponentPushToken[b]'], {
      title: 'Tonight',
      body: 'Ready',
      data: { kind: 'daily_horoscope' },
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      to: 'ExponentPushToken[a]',
      title: 'Tonight',
      body: 'Ready',
      sound: 'default',
      channelId: 'default',
      data: { kind: 'daily_horoscope' },
    });
  });

  it('classifies tickets into actionable outcomes', () => {
    expect(classifyTicket({ status: 'ok', id: 'r1' })).toBe('ok');
    expect(classifyTicket({ status: 'error', details: { error: 'DeviceNotRegistered' } })).toBe('invalid_token');
    expect(classifyTicket({ status: 'error', details: { error: 'InvalidCredentials' } })).toBe('invalid_token');
    expect(classifyTicket({ status: 'error', details: { error: 'MessageRateExceeded' } })).toBe('retriable');
    expect(classifyTicket({ status: 'error', details: { error: 'MessageTooBig' } })).toBe('fatal');
    expect(classifyTicket(undefined)).toBe('retriable');
  });

  it('classifies receipts, only flagging dead tokens for cleanup', () => {
    expect(classifyReceipt({ status: 'ok' })).toBe('ok');
    expect(classifyReceipt({ status: 'error', details: { error: 'DeviceNotRegistered' } })).toBe('invalid_token');
    expect(classifyReceipt({ status: 'error', details: { error: 'MessageRateExceeded' } })).toBe('retriable');
  });
});

describe('expo push network calls', () => {
  it('posts messages and returns tickets', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }), { status: 200 }),
    ) as unknown as typeof fetch;
    const tickets = await sendExpoPushBatch([{ to: 'ExponentPushToken[a]', title: 't', body: 'b' }], { fetchImpl });
    expect(tickets).toEqual([{ status: 'ok', id: 'r1' }]);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('adds bearer auth when an access token is provided', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })) as unknown as typeof fetch;
    await sendExpoPushBatch([{ to: 'ExponentPushToken[a]', title: 't', body: 'b' }], {
      fetchImpl,
      accessToken: 'secret-token',
    });
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
  });

  it('throws on non-ok responses so the caller can retry', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 502 })) as unknown as typeof fetch;
    await expect(sendExpoPushBatch([{ to: 'ExponentPushToken[a]', title: 't', body: 'b' }], { fetchImpl })).rejects.toThrow();
  });

  it('returns an empty map when no receipt ids are requested', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await getExpoPushReceipts([], { fetchImpl })).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches receipts keyed by ticket id', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { r1: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;
    const receipts = await getExpoPushReceipts(['r1'], { fetchImpl });
    expect(receipts.r1.status).toBe('error');
  });
});
