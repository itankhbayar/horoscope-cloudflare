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
