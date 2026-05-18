import type { AuthResult, AuthUser } from '@horoscope/shared';
import type { User } from '../db/schema';

/** Map Drizzle `users` row to public auth/profile DTO. */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName ?? undefined,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    createdAt: user.createdAt,
    isPremium: Boolean(user.isPremium),
  };
}

/** Slim user object embedded in login/register `AuthResult`. */
export function toAuthResultUser(
  user: Pick<User, 'id' | 'email' | 'fullName' | 'isPremium'>,
): AuthResult['user'] {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isPremium: Boolean(user.isPremium),
  };
}
