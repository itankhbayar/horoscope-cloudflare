import type { NotificationPreferencesUpdate } from '@astralis/lib/types';

export type CalmRitualPresetId =
  | 'quiet_reflection'
  | 'soft_evening'
  | 'minimal_atmosphere'
  | 'deep_night'
  | 'relationship_reflection'
  | 'sleep_transition';

export type CalmRitualPreset = {
  id: CalmRitualPresetId;
  title: string;
  summary: string;
  notificationPatch: NotificationPreferencesUpdate;
  silentModeEnabled: boolean;
  ambientIntensity: 'minimal' | 'soft' | 'immersive';
  motionPacing: 'still' | 'slow' | 'cinematic';
  ritualDensity: 'light' | 'balanced' | 'deep';
  reflectionDepth: 'single_line' | 'guided' | 'layered';
};

export const CALM_RITUAL_PRESETS: CalmRitualPreset[] = [
  {
    id: 'quiet_reflection',
    title: 'Quiet Reflection',
    summary: 'One soft nightly reminder, low motion, short reflection.',
    notificationPatch: {
      allEnabled: true,
      dailyReminderEnabled: true,
      horoscopesEnabled: true,
      transitsEnabled: false,
      reEngagementEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      reminderHourLocal: 20,
    },
    silentModeEnabled: true,
    ambientIntensity: 'soft',
    motionPacing: 'slow',
    ritualDensity: 'light',
    reflectionDepth: 'single_line',
  },
  {
    id: 'soft_evening',
    title: 'Soft Evening Ritual',
    summary: 'A balanced evening rhythm with atmosphere and reflection.',
    notificationPatch: {
      allEnabled: true,
      dailyReminderEnabled: true,
      horoscopesEnabled: true,
      transitsEnabled: true,
      reEngagementEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      reminderHourLocal: 21,
    },
    silentModeEnabled: false,
    ambientIntensity: 'soft',
    motionPacing: 'slow',
    ritualDensity: 'balanced',
    reflectionDepth: 'guided',
  },
  {
    id: 'minimal_atmosphere',
    title: 'Minimal Atmosphere',
    summary: 'Almost silent. Astralis stays present without much interruption.',
    notificationPatch: {
      allEnabled: true,
      dailyReminderEnabled: false,
      horoscopesEnabled: true,
      transitsEnabled: false,
      reEngagementEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00',
      reminderHourLocal: 19,
    },
    silentModeEnabled: true,
    ambientIntensity: 'minimal',
    motionPacing: 'still',
    ritualDensity: 'light',
    reflectionDepth: 'single_line',
  },
  {
    id: 'deep_night',
    title: 'Deep Night Ritual',
    summary: 'More immersive pacing for nights when you want to sink in.',
    notificationPatch: {
      allEnabled: true,
      dailyReminderEnabled: true,
      horoscopesEnabled: true,
      transitsEnabled: true,
      reEngagementEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '08:30',
      reminderHourLocal: 22,
    },
    silentModeEnabled: true,
    ambientIntensity: 'immersive',
    motionPacing: 'cinematic',
    ritualDensity: 'deep',
    reflectionDepth: 'layered',
  },
  {
    id: 'relationship_reflection',
    title: 'Relationship Reflection',
    summary: 'Gentle emphasis on social atmosphere and emotional tone.',
    notificationPatch: {
      allEnabled: true,
      dailyReminderEnabled: true,
      horoscopesEnabled: true,
      transitsEnabled: true,
      reEngagementEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      reminderHourLocal: 20,
    },
    silentModeEnabled: false,
    ambientIntensity: 'soft',
    motionPacing: 'slow',
    ritualDensity: 'balanced',
    reflectionDepth: 'guided',
  },
  {
    id: 'sleep_transition',
    title: 'Calm Sleep Transition',
    summary: 'Earlier, quieter reminders with less reading and softer motion.',
    notificationPatch: {
      allEnabled: true,
      dailyReminderEnabled: true,
      horoscopesEnabled: true,
      transitsEnabled: false,
      reEngagementEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: '21:30',
      quietHoursEnd: '08:00',
      reminderHourLocal: 20,
    },
    silentModeEnabled: true,
    ambientIntensity: 'minimal',
    motionPacing: 'still',
    ritualDensity: 'light',
    reflectionDepth: 'single_line',
  },
];

export function getCalmRitualPreset(id: CalmRitualPresetId): CalmRitualPreset {
  const preset = CALM_RITUAL_PRESETS.find((item) => item.id === id);
  if (!preset) return CALM_RITUAL_PRESETS[1]!;
  return preset;
}
