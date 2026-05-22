import type { AuthUser } from './types';

/** `POST /api/auth/register` and `POST /api/auth/login` response. */
export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime?: string | null;
  birthCity: string;
  birthCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezoneOffset?: number | null;
  birthDataConsent: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface NotificationPreferencesUpdate {
  allEnabled?: boolean;
  saleAlertsEnabled?: boolean;
  horoscopesEnabled?: boolean;
  transitsEnabled?: boolean;
}

export interface PushTokenRegistrationPayload {
  expoPushToken: string;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  deviceId?: string | null;
}

/** `POST /api/auth/logout` and `DELETE /api/account` success body. */
export interface OkResponse {
  ok: true;
}

/** Generic API error JSON body. */
export interface ApiErrorBody {
  error: string;
}

/** Client-side fetch error with HTTP status (not returned by API). */
export interface ApiError {
  status: number;
  message: string;
}
