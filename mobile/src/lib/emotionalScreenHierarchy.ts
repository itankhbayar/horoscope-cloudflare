export type EmotionalMomentId =
  | 'arrival'
  | 'resonance'
  | 'reflection'
  | 'relationship'
  | 'quiet'
  | 'sleep_transition'
  | 'archive_revisit'
  | 'premium_continuity';

export type ScreenPurposeId = 'guest_welcome' | 'premium' | 'ritual_history' | 'notifications' | 'profile';

export type PacingRhythm = 'still' | 'slow' | 'guided' | 'deep';

export type EmotionalScreenPurpose = {
  screen: ScreenPurposeId;
  purpose: string;
  atmosphericTone: string;
  dominantSignal: string;
  pacingRhythm: PacingRhythm;
  primaryAction: string;
  secondaryActions: string[];
  avoid: string[];
  moment: EmotionalMomentId;
};

export type MomentDefinition = {
  id: EmotionalMomentId;
  label: string;
  focus: string;
  primarySurface: string;
  textStrategy: 'single_line' | 'short_prompt' | 'fragment' | 'progressive';
  maxVisibleActions: number;
};

export const MOMENTS: MomentDefinition[] = [
  {
    id: 'arrival',
    label: 'Arrival moment',
    focus: 'enter the atmosphere without asking for commitment',
    primarySurface: 'global sky',
    textStrategy: 'single_line',
    maxVisibleActions: 1,
  },
  {
    id: 'resonance',
    label: 'Resonance moment',
    focus: 'feel a lightweight personal echo',
    primarySurface: 'sign or birth date preview',
    textStrategy: 'short_prompt',
    maxVisibleActions: 1,
  },
  {
    id: 'reflection',
    label: 'Reflection moment',
    focus: 'name one emotional texture',
    primarySurface: 'ritual prompt',
    textStrategy: 'fragment',
    maxVisibleActions: 1,
  },
  {
    id: 'relationship',
    label: 'Relationship moment',
    focus: 'notice social atmosphere without forcing contact',
    primarySurface: 'relationship card',
    textStrategy: 'fragment',
    maxVisibleActions: 1,
  },
  {
    id: 'quiet',
    label: 'Quiet moment',
    focus: 'reduce stimulation and preserve stillness',
    primarySurface: 'ambient ritual',
    textStrategy: 'single_line',
    maxVisibleActions: 1,
  },
  {
    id: 'sleep_transition',
    label: 'Sleep-transition moment',
    focus: 'soften the end of the night',
    primarySurface: 'dream tone',
    textStrategy: 'single_line',
    maxVisibleActions: 1,
  },
  {
    id: 'archive_revisit',
    label: 'Archive revisit moment',
    focus: 'return to emotional memory without turning it into metrics',
    primarySurface: 'saved moments',
    textStrategy: 'fragment',
    maxVisibleActions: 1,
  },
  {
    id: 'premium_continuity',
    label: 'Premium continuity moment',
    focus: 'deepen private ritual continuity',
    primarySurface: 'private archive',
    textStrategy: 'progressive',
    maxVisibleActions: 1,
  },
];

export const SCREEN_PURPOSES: Record<ScreenPurposeId, EmotionalScreenPurpose> = {
  guest_welcome: {
    screen: 'guest_welcome',
    purpose: 'arrival into atmosphere',
    atmosphericTone: 'living sky, unhurried',
    dominantSignal: 'collective sky mood',
    pacingRhythm: 'slow',
    primaryAction: 'enter ritual',
    secondaryActions: ['personalize lightly'],
    avoid: ['configuration', 'diagnostics', 'dense explanation', 'multiple competing CTAs'],
    moment: 'arrival',
  },
  premium: {
    screen: 'premium',
    purpose: 'private continuity',
    atmosphericTone: 'quiet archive, intimate',
    dominantSignal: 'longitudinal emotional memory',
    pacingRhythm: 'deep',
    primaryAction: 'deepen ritual',
    secondaryActions: ['restore access'],
    avoid: ['feature showcase energy', 'unlock-everything copy', 'crowded comparison tables'],
    moment: 'premium_continuity',
  },
  ritual_history: {
    screen: 'ritual_history',
    purpose: 'gentle reflection',
    atmosphericTone: 'memory fragments, private',
    dominantSignal: 'emotional continuity',
    pacingRhythm: 'still',
    primaryAction: 'revisit moments',
    secondaryActions: ['share milestone when meaningful'],
    avoid: ['graphs', 'scores', 'productivity dashboards', 'streak pressure'],
    moment: 'archive_revisit',
  },
  notifications: {
    screen: 'notifications',
    purpose: 'calm invitation control',
    atmosphericTone: 'quiet agency',
    dominantSignal: 'ritual rhythm',
    pacingRhythm: 'guided',
    primaryAction: 'choose rhythm',
    secondaryActions: ['advanced delivery details'],
    avoid: ['admin panel density', 'technical diagnostics first', 'too many toggles'],
    moment: 'quiet',
  },
  profile: {
    screen: 'profile',
    purpose: 'identity and private continuity',
    atmosphericTone: 'personal archive',
    dominantSignal: 'saved ritual rhythm',
    pacingRhythm: 'still',
    primaryAction: 'review account',
    secondaryActions: ['edit profile'],
    avoid: ['dashboard clutter', 'too many account actions above ritual memory'],
    moment: 'archive_revisit',
  },
};

export function getScreenPurpose(screen: ScreenPurposeId): EmotionalScreenPurpose {
  return SCREEN_PURPOSES[screen];
}

export function getMoment(id: EmotionalMomentId): MomentDefinition {
  return MOMENTS.find((moment) => moment.id === id) ?? MOMENTS[0]!;
}

export function shouldCompressExplanations({
  returningUser,
  ambientMode,
  reducedMotion,
  ritualNights,
}: {
  returningUser: boolean;
  ambientMode: boolean;
  reducedMotion: boolean;
  ritualNights: number;
}): boolean {
  return returningUser || ambientMode || reducedMotion || ritualNights >= 3;
}

export function visibleMomentLimit(moment: EmotionalMomentId): number {
  return getMoment(moment).maxVisibleActions;
}
