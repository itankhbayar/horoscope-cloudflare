import { describe, expect, it, vi } from 'vitest';
import type { PurchasesPackage } from 'react-native-purchases';
import { buildPremiumPlanDisplays, fallbackPremiumPlanDisplays, pickManageSubscriptionProductId } from './packages';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

function pkg(identifier: string, productIdentifier: string, priceString: string, pricePerMonthString?: string) {
  return {
    identifier,
    product: {
      identifier: productIdentifier,
      priceString,
      pricePerMonthString,
    },
  } as PurchasesPackage;
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
});
