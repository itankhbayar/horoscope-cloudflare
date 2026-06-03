import { describe, expect, it, vi } from 'vitest';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  buildPremiumPlanDisplays,
  checkoutDeferredPremiumPlanDisplays,
  fallbackPremiumPlanDisplays,
  pickManageSubscriptionProductId,
  premiumCtaLabelKey,
  shouldShowTrialFooter,
} from './packages';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

type IntroOffer = { price: number; periodUnit: string; periodNumberOfUnits: number };

function pkg(
  identifier: string,
  productIdentifier: string,
  priceString: string,
  pricePerMonthString?: string,
  introPrice: IntroOffer | null = null,
) {
  return {
    identifier,
    product: {
      identifier: productIdentifier,
      priceString,
      pricePerMonthString,
      introPrice,
    },
  } as unknown as PurchasesPackage;
}

describe('RevenueCat package mapping', () => {
  it('maps configured packages to localized display prices', () => {
    const plans = buildPremiumPlanDisplays([
      pkg('monthly', 'com.astralis.premium.monthly', 'US$6.99'),
      pkg('annual', 'com.astralis.premium.yearly', 'US$49.99', 'US$4.17'),
    ]);

    expect(plans).toMatchObject([
      {
        id: 'monthly',
        price: 'US$6.99',
        productIdentifier: 'com.astralis.premium.monthly',
        available: true,
      },
      {
        id: 'yearly',
        price: 'US$49.99',
        productIdentifier: 'com.astralis.premium.yearly',
        note: 'US$4.17 per month, billed yearly.',
        available: true,
      },
    ]);
  });

  it('does not invent prices when an offering is empty or incomplete', () => {
    expect(buildPremiumPlanDisplays([]).every((plan) => plan.available === false)).toBe(true);

    const [monthly, yearly] = buildPremiumPlanDisplays([
      pkg('monthly', 'com.astralis.premium.monthly', 'US$6.99'),
    ]);

    expect(monthly?.available).toBe(true);
    expect(yearly).toMatchObject({
      id: 'yearly',
      price: 'Unavailable',
      available: false,
      unavailableReason: 'Missing RevenueCat package "annual" in the active offering.',
    });
  });

  it('uses an unavailable fallback for unconfigured development builds', () => {
    expect(fallbackPremiumPlanDisplays('not configured')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'monthly', available: false, unavailableReason: 'not configured' }),
        expect.objectContaining({ id: 'yearly', available: false, unavailableReason: 'not configured' }),
      ]),
    );
  });

  it('prefers yearly product ids for subscription management links', () => {
    const plans = buildPremiumPlanDisplays([
      pkg('monthly', 'monthly.product', 'US$6.99'),
      pkg('annual', 'yearly.product', 'US$49.99'),
    ]);

    expect(pickManageSubscriptionProductId(plans)).toBe('yearly.product');
  });

  it('reads a free-trial intro offer from the store product and never invents one', () => {
    const [monthly, yearly] = buildPremiumPlanDisplays([
      pkg('monthly', 'monthly.product', 'US$6.99', undefined, {
        price: 0,
        periodUnit: 'DAY',
        periodNumberOfUnits: 7,
      }),
      // No intro offer on yearly → must NOT advertise a trial.
      pkg('annual', 'yearly.product', 'US$49.99'),
    ]);

    expect(monthly).toMatchObject({ hasTrial: true, trialDays: 7 });
    expect(yearly).toMatchObject({ hasTrial: false, trialDays: null });
  });

  it('treats a non-zero intro price as a discount, not a free trial', () => {
    const [monthly] = buildPremiumPlanDisplays([
      pkg('monthly', 'monthly.product', 'US$6.99', undefined, {
        price: 1.99,
        periodUnit: 'MONTH',
        periodNumberOfUnits: 1,
      }),
    ]);

    expect(monthly).toMatchObject({ hasTrial: false, trialDays: null });
  });

  it('advertises the backend-enforced trial for deferred (mobile Stripe) pricing', () => {
    expect(checkoutDeferredPremiumPlanDisplays('resolved at checkout').every((p) => p.hasTrial)).toBe(true);
  });

  it('keeps unavailable and fallback plans trial-free', () => {
    expect(buildPremiumPlanDisplays([]).every((p) => p.hasTrial === false)).toBe(true);
    expect(fallbackPremiumPlanDisplays('not configured').every((p) => p.hasTrial === false)).toBe(true);
  });
});

describe('paywall CTA copy gating', () => {
  it('shows trial copy only when the selected plan actually has a trial', () => {
    expect(premiumCtaLabelKey({ isPremium: false, hasTrial: true })).toBe('premium.trialCta');
    expect(shouldShowTrialFooter({ isPremium: false, hasTrial: true })).toBe(true);
  });

  it('falls back to normal premium copy when no trial exists', () => {
    expect(premiumCtaLabelKey({ isPremium: false, hasTrial: false })).toBe('premium.cta');
    expect(shouldShowTrialFooter({ isPremium: false, hasTrial: false })).toBe(false);
  });

  it('shows manage copy and no trial footer for existing premium members', () => {
    expect(premiumCtaLabelKey({ isPremium: true, hasTrial: true })).toBe('premium.activeCta');
    expect(shouldShowTrialFooter({ isPremium: true, hasTrial: true })).toBe(false);
  });
});
