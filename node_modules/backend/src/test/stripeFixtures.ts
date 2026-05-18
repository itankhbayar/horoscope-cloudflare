import type Stripe from 'stripe';

export function stripeEvent<T extends Stripe.Event.Type>(
  type: T,
  object: Record<string, unknown>,
  id = `evt_${type.replace(/\./g, '_')}`,
): Stripe.Event {
  return {
    id,
    object: 'event',
    type,
    data: { object },
  } as unknown as Stripe.Event;
}
