# Mobile Retention + Push Audit

## Implemented now

- Mobile stores privacy-safe analytics consent locally and sends only typed product events after opt-in.
- Notification preferences now model daily horoscope reminders, streak reminders, inactive-user re-engagement, quiet hours, and local reminder hour.
- Backend scheduling rules now reject disabled preferences, disabled tokens, quiet-hour windows, and missing dedupe keys.
- Mobile onboarding no longer asks for push permission early; opt-in happens from notification settings.

## Launch-blocking push gaps

- There is still no durable push queue table or queue binding.
- There is no Expo send worker, retry policy, receipt polling, or invalid-token cleanup job.
- There is no persisted notification delivery dedupe table yet; only the dedupe-key rule exists.
- Timezone-aware fanout still needs a scheduled worker that groups users by local hour and user timezone.

## Practical next backend step

Add a `notification_jobs` table or Cloudflare Queue producer/consumer with:

- `dedupe_key` unique index.
- `kind`, `user_id`, `expo_push_token`, `scheduled_for`, `status`, `attempt_count`, `last_error`.
- retry with bounded attempts.
- Expo receipt polling that disables invalid push tokens.

## Trial lifecycle nudges (signup-anchored)

A drip of one-time lifecycle pushes runs on top of the existing hourly retention
pipeline (`enqueueDueNotifications`), implemented in
`backend/src/services/trialLifecycleService.ts`.

- **Stages:** Day 1, 3, 5, 6, 7, plus a single lapsed-recovery touch on Day 10
  (`TRIAL_LIFECYCLE_DAYS` + `TRIAL_LAPSED_DAY`). Each is a distinct
  `notification_jobs.kind` (`trial_day_1` … `trial_day_7`, `trial_lapsed`).
- **Anchor:** "Day N" = whole local-calendar days since `users.created_at`, in
  the user's timezone (signup day = Day 0). This is **not** the real Stripe trial
  window — it validates the lifecycle cadence and messaging first.
- **Precedence:** when a stage is due, it replaces the daily/streak/win-back
  selection for that run, so a user still gets at most one push per reminder hour.
- **Audience / gating:** **not** gated on `isPremium`. A `trialing` subscription
  is marked `isPremium = true`
  (`billingService.ts` → `syncPremiumFromSubscription`), and there is no persisted
  subscription status, so `isPremium` cannot distinguish trial from paid and would
  wrongly suppress the trial audience. Gating is only: master `all_enabled`, an
  enabled push token, quiet hours, and a stage-scoped dedupe key
  (`trial:{userId}:{stage}`, date-free → fires once ever).
- **Copy:** deliberately billing-neutral — no charge, subscription, payment, or
  real trial-timing language (locked in by a test in
  `trialLifecycleService.test.ts`).
- **Analytics:** operational `metric()` / `log()` only
  (`trial_lifecycle_enqueue` + `lifecycleEnqueued` in the enqueue-completed log).
  No PostHog / `BACKEND_OWNED_EVENTS` changes.

### Future enhancement — `trialStartedAt`

A later, billing-focused iteration can persist a real trial-start timestamp
(populated from the `trial_started` signal in the billing webhook) and re-anchor
these stages to the actual trial window. That would unlock trial-specific urgency
copy (e.g. end-of-trial reminders) that today's signup anchor must avoid. Until
then the stages stay signup-anchored and billing-neutral.
