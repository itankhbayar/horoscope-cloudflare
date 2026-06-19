import type { AppBindings } from '../types';

/** True when Claude reading generation is paused via the PAUSE_AI_READINGS flag. */
export function isAiReadingsPaused(env: Pick<AppBindings, 'PAUSE_AI_READINGS'>): boolean {
  const value = (env.PAUSE_AI_READINGS ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

/**
 * Anthropic API key to hand the prewarm jobs, or `undefined` when AI readings are
 * paused. Withholding the key makes prewarm fall back to local templates without
 * deleting the stored ANTHROPIC_API_KEY secret, so resuming is a single flag flip.
 */
export function anthropicKeyForPrewarm(
  env: Pick<AppBindings, 'ANTHROPIC_API_KEY' | 'PAUSE_AI_READINGS'>,
): string | undefined {
  return isAiReadingsPaused(env) ? undefined : env.ANTHROPIC_API_KEY;
}
