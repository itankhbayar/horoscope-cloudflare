import { describe, expect, it } from 'vitest';
import { CALM_RITUAL_PRESETS, getCalmRitualPreset } from './calmRitualPresets';

describe('calm ritual presets', () => {
  it('provides emotionally named presets with concrete preference patches', () => {
    expect(CALM_RITUAL_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(CALM_RITUAL_PRESETS.every((preset) => preset.title.length > 0 && preset.summary.length > 0)).toBe(true);
    expect(getCalmRitualPreset('quiet_reflection').notificationPatch.quietHoursEnabled).toBe(true);
  });

  it('keeps minimal atmosphere low-interruption by default', () => {
    const preset = getCalmRitualPreset('minimal_atmosphere');

    expect(preset.notificationPatch.dailyReminderEnabled).toBe(false);
    expect(preset.silentModeEnabled).toBe(true);
    expect(preset.ritualDensity).toBe('light');
  });
});
