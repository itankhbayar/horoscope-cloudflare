# Mobile Real-Device Checklist

Last reviewed: 2026-05-23

Use this before treating Premium or notifications as product-ready. Do not mark purchases successful unless the store SDK and backend sync both confirm access.

## RevenueCat / iOS

- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` is set in `mobile/.env`.
- `EXPO_PUBLIC_REVENUECAT_OFFERING_ID` matches the dashboard offering, or the dashboard current offering is correct.
- `EXPO_PUBLIC_REVENUECAT_PACKAGE_MONTHLY` and `EXPO_PUBLIC_REVENUECAT_PACKAGE_ANNUAL` match package identifiers shown in RevenueCat.
- Monthly and yearly products appear on a physical iPhone or StoreKit-enabled dev build.
- Canceling purchase shows a canceled state and does not unlock Premium.
- Successful sandbox purchase updates RevenueCat customer info, syncs backend premium status, and survives app restart.
- Restore purchases works for an existing sandbox subscriber.
- Manage subscription copy points users to Apple ID subscriptions until a direct management URL is added.

## Android / Stripe

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is a test publishable key in development.
- Checkout cannot open when the key is missing.
- Canceled checkout does not unlock Premium.
- Successful test checkout refreshes backend premium status.
- Billing portal opens for an account with a Stripe customer.

## Notifications

- `EXPO_PUBLIC_EAS_PROJECT_ID` or `expo.extra.eas.projectId` is present.
- Physical device permission prompt appears once.
- Denied permission keeps onboarding/profile usable.
- Enabled preferences register an Expo push token with the backend.
