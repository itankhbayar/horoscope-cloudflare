/**
 * Client helper for the `first_horoscope_revealed` activation milestone.
 *
 * The once-per-user guarantee is owned by the server (it flips a user flag and returns
 * `firstHoroscopeReveal: true` on exactly one completion response). This module only decides
 * the analytics payload for that single gated moment, so it can never fire twice regardless
 * of client state, restarts, logout/login, or device.
 */

export interface FirstRevealEventProps {
  sign?: string;
  platform: string;
  days_since_signup?: number;
}

/** Whole days between signup and `now` (never negative). Undefined when unknown. */
export function daysSinceSignup(
  createdAtISO: string | null | undefined,
  now: number = Date.now(),
): number | undefined {
  if (!createdAtISO) return undefined;
  const created = Date.parse(createdAtISO);
  if (Number.isNaN(created)) return undefined;
  return Math.max(0, Math.floor((now - created) / 86_400_000));
}

export interface FirstRevealContext {
  /** Server-authoritative flag from the completion response. */
  firstHoroscopeReveal?: boolean;
  sign?: string | null;
  platform: string;
  createdAt?: string | null;
  now?: number;
}

/**
 * Returns the analytics props for `first_horoscope_revealed`, or `null` when the event must
 * not be emitted (i.e. the server did not just claim the milestone). Optional fields are
 * omitted when unavailable, matching the "if available" contract.
 */
export function firstRevealEventProps(ctx: FirstRevealContext): FirstRevealEventProps | null {
  if (!ctx.firstHoroscopeReveal) return null;
  const props: FirstRevealEventProps = { platform: ctx.platform };
  if (ctx.sign) props.sign = ctx.sign;
  const days = daysSinceSignup(ctx.createdAt, ctx.now);
  if (days !== undefined) props.days_since_signup = days;
  return props;
}
