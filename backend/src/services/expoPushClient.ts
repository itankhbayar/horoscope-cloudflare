/**
 * Minimal Expo push delivery client.
 *
 * Wraps the Expo push HTTP API (send + receipts). Stateless and side-effect free
 * except for the network calls, so the pipeline in notificationQueueService can
 * own all database state, retries, and token cleanup.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const EXPO_BATCH_SIZE = 100;

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

export type TicketOutcome = 'ok' | 'invalid_token' | 'retriable' | 'fatal';

/** Expo error codes that mean the token is dead and must be disabled. */
const INVALID_TOKEN_ERRORS = new Set(['DeviceNotRegistered', 'InvalidCredentials']);
/** Expo error codes worth retrying on a later run. */
const RETRIABLE_ERRORS = new Set(['MessageRateExceeded']);

export function chunk<T>(items: T[], size = EXPO_BATCH_SIZE): T[][] {
  if (size <= 0) throw new Error('chunk size must be positive');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function buildExpoMessages(
  tokens: string[],
  copy: { title: string; body: string; data?: Record<string, unknown> },
): ExpoPushMessage[] {
  return tokens.map((to) => ({
    to,
    title: copy.title,
    body: copy.body,
    data: copy.data,
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  }));
}

/** Classify a single send ticket into an actionable outcome. */
export function classifyTicket(ticket: ExpoPushTicket | undefined): TicketOutcome {
  if (!ticket) return 'retriable';
  if (ticket.status === 'ok') return 'ok';
  const error = ticket.details?.error;
  if (error && INVALID_TOKEN_ERRORS.has(error)) return 'invalid_token';
  if (error && RETRIABLE_ERRORS.has(error)) return 'retriable';
  return 'fatal';
}

/** Classify a delayed receipt: only invalid-token receipts need follow-up action. */
export function classifyReceipt(receipt: ExpoPushReceipt | undefined): TicketOutcome {
  if (!receipt) return 'retriable';
  if (receipt.status === 'ok') return 'ok';
  const error = receipt.details?.error;
  if (error && INVALID_TOKEN_ERRORS.has(error)) return 'invalid_token';
  if (error && RETRIABLE_ERRORS.has(error)) return 'retriable';
  return 'fatal';
}

function authHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (accessToken && accessToken.trim().length > 0) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  }
  return headers;
}

/**
 * Sends one batch of <=100 messages. Returns tickets positionally aligned to the
 * input messages. Throws on transport/HTTP failure so the caller can retry the job.
 */
export async function sendExpoPushBatch(
  messages: ExpoPushMessage[],
  options: { accessToken?: string; fetchImpl?: typeof fetch } = {},
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(EXPO_SEND_URL, {
    method: 'POST',
    headers: authHeaders(options.accessToken),
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    throw new Error(`Expo push send failed with status ${response.status}`);
  }
  const payload = (await response.json()) as { data?: ExpoPushTicket[] };
  return Array.isArray(payload.data) ? payload.data : [];
}

/** Fetches delivery receipts for previously returned ticket ids. */
export async function getExpoPushReceipts(
  receiptIds: string[],
  options: { accessToken?: string; fetchImpl?: typeof fetch } = {},
): Promise<Record<string, ExpoPushReceipt>> {
  if (receiptIds.length === 0) return {};
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(EXPO_RECEIPTS_URL, {
    method: 'POST',
    headers: authHeaders(options.accessToken),
    body: JSON.stringify({ ids: receiptIds }),
  });
  if (!response.ok) {
    throw new Error(`Expo push receipts failed with status ${response.status}`);
  }
  const payload = (await response.json()) as { data?: Record<string, ExpoPushReceipt> };
  return payload.data ?? {};
}

export { EXPO_BATCH_SIZE };
