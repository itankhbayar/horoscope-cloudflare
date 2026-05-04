import Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { stripeWebhookEvents, users } from '../db/schema';
import { getUserById } from './authService';

const SUCCESS_URL = 'http://localhost:5173/premium/success';
const CANCEL_URL = 'http://localhost:5173/premium/cancel';

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export async function createPremiumCheckoutSession(
  stripe: Stripe,
  priceId: string,
  userId: string,
  customerEmail: string,
): Promise<Stripe.Checkout.Session> {
  const price = await stripe.prices.retrieve(priceId);
  const mode: Stripe.Checkout.SessionCreateParams.Mode =
    price.type === 'recurring' ? 'subscription' : 'payment';

  return stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: SUCCESS_URL,
    cancel_url: CANCEL_URL,
    metadata: { userId },
    customer_email: customerEmail,
  });
}

/** Returns true if this event was newly claimed (should apply side effects). */
export async function claimStripeWebhookEvent(db: DB, eventId: string): Promise<boolean> {
  const rows = await db
    .insert(stripeWebhookEvents)
    .values({ id: eventId })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEvents.id });
  return rows.length > 0;
}

export async function releaseStripeWebhookClaim(db: DB, eventId: string): Promise<void> {
  await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, eventId));
}

export async function grantPremiumFromCheckoutSession(
  db: DB,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId?.trim();
  if (!userId) {
    console.error('[billing] checkout.session.completed missing metadata.userId', session.id);
    return;
  }

  const user = await getUserById(db, userId);
  if (!user) {
    console.error('[billing] checkout.session.completed unknown user', userId);
    return;
  }

  await db
    .update(users)
    .set({ isPremium: true, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(eq(users.id, userId));
}
