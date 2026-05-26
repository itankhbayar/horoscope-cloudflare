# Analytics Ritual Event Migration

Astralis Home and ritual surfaces now use continuation-oriented analytics names while preserving legacy dashboard continuity through `trackRitualEvent`.

All events emitted through the migration helper include:

- `analyticsSchemaVersion: 2`
- `ritualEventMigration: true`
- `canonicalEventName`
- `emissionMode: "canonical" | "legacy_alias"`
- `legacyEventAlias` on compatibility emissions

## Bridged Events

| New ritual event | Legacy event emitted during migration | Notes |
| --- | --- | --- |
| `deeper_layer_tapped` | `locked_content_tapped` | Preserves `horoscope_period` and period fields when a non-today period prompts a premium continuation. |
| `premium_continuation_viewed` | `paywall_viewed` | Maps Home ritual sources to the closest legacy paywall source, usually `post_reading`. |
| `premium_continuation_tapped` | `paywall_viewed` | Keeps paywall funnel dashboards intact while call sites use ritual language. |
| `private_archive_prompt_viewed` | `paywall_viewed`, `premium_paywall_triggered` | Preserves premium trigger reporting for archive and continuity prompts. |
| `expanded_reading_requested` | `reading_revealed` | Preserves revealed-reading dashboards when the requested reading maps to an existing surface. |
| `ritual_moment_continued` | none | New sequence-flow event with no legacy equivalent. |

## Going Forward

New Home, ritual, archive, and premium-continuation code should call `trackRitualEvent` instead of direct legacy events. Keep direct `track` usage for unrelated billing, checkout, auth, notification, and platform lifecycle events.

Use helpers from `mobile/src/lib/analytics.ts`:

- `trackRitualEvent(...)` for canonical ritual events
- `normalizeRitualEventName(...)` when translating historical names
- `isLegacyAliasEvent(...)` when filtering migration compatibility events

In development, direct calls to bridged legacy event names warn once per event name. Production analytics behavior is unchanged.

## Dashboard Migration

During migration, dashboards may count both new and legacy events if they query broad event groups. Prefer either the new ritual event family or the legacy event family per chart until reporting is updated.

Canonical-only query rule:

```sql
emissionMode = 'canonical'
OR emissionMode IS NULL
```

Alias-exclusion rule for ritual migration charts:

```sql
NOT (ritualEventMigration = true AND emissionMode = 'legacy_alias')
```

Legacy-dashboard-only query rule:

```sql
event IN ('locked_content_tapped', 'paywall_viewed', 'premium_paywall_triggered', 'reading_revealed')
AND (
  ritualEventMigration IS NULL
  OR emissionMode = 'legacy_alias'
)
```

Inflated query mistake:

```sql
event IN ('deeper_layer_tapped', 'locked_content_tapped')
```

That counts the same user action twice during dual emission. Use `emissionMode = 'canonical'` when mixing old and new event families.

Recommended migration order:

1. Paywall funnel dashboards: move from `paywall_viewed` / `premium_paywall_triggered` to `premium_continuation_viewed`, `premium_continuation_tapped`, and `private_archive_prompt_viewed`.
2. Locked-depth dashboards: move from `locked_content_tapped` to `deeper_layer_tapped`.
3. Reading-depth dashboards: move from `reading_revealed` to `expanded_reading_requested`.
4. Home sequence dashboards: adopt `ritual_moment_continued` directly because it has no legacy equivalent.

Keep dual emission for at least 90 days after dashboard migration begins, then remove bridge emission only after:

- paywall funnel charts read `premium_continuation_*` / `private_archive_prompt_viewed`
- old locked-content charts have a replacement using `deeper_layer_tapped`
- reading-depth charts read `expanded_reading_requested`
- exported historical reports no longer depend on the legacy names
- canonical-only filters have been added anywhere old and new event families are queried together
- alerting and retention cohorts have been checked for duplicate-count sensitivity

## Risk Notes

The bridge intentionally keeps legacy names in the analytics type map because they represent historical event contracts, not user-facing product language. Billing, entitlement, checkout, and auth analytics are intentionally unchanged.

Do not rename checkout, subscription, RevenueCat, Stripe, App Store, auth, or notification delivery events as part of this migration. Those events are separate operational contracts.
