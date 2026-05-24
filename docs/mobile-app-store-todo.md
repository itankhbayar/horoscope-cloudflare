# Mobile App Store TODO

Last reviewed: 2026-05-23

This is intentionally a later-launch checklist. Current work should focus on product readiness, not final submission ceremony.

## Must Fix Before Public Launch

- Add a searchable birth city picker backed by the same city data as the API, with a manual coordinate fallback.
- Confirm RevenueCat products, offerings, entitlement IDs, restore behavior, and manage subscription copy on iOS.
- Verify notification permission copy on real iOS and Android devices with a production EAS project ID.
- Run a privacy review against real analytics, error reporting, billing, push, and avatar storage configuration.
- Fix mobile TypeScript configuration so `npm run typecheck` is usable for React Native JSX and shared Vite `import.meta.env` files.

## App Store Submission Later

- Final app icon, splash screen, and adaptive icon QA.
- App Store screenshots for required device sizes.
- App Store privacy nutrition labels.
- Support URL, marketing URL, privacy URL, and account deletion URL verification.
- iOS privacy manifest review if native dependency manifests are incomplete after the final dependency set is locked.
- EAS production build profile, signing, TestFlight QA, and release notes.

## Can Wait

- Store listing copy and keyword optimization.
- Promotional screenshots and preview videos.
- Localized store metadata.
