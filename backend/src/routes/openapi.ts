import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings, AppVariables } from '../types';
import { loginSchema, refreshTokenBodySchema, registerSchema } from '../schemas/auth';
import { updateProfileSchema } from '../schemas/profile';
import {
  checkoutSyncSchema,
  mobileCheckoutSchema,
  mobilePortalSchema,
  revenueCatWebhookSchema,
} from '../schemas/billing';
import {
  notificationPreferencesUpdateSchema,
  pushTokenSchema,
  deletePushTokenSchema,
} from '../schemas/notifications';
import {
  citySearchQuerySchema,
  dailyHoroscopeParamsSchema,
  dailyHoroscopeQuerySchema,
} from '../schemas/horoscope';
import {
  compatibilityQuerySchema,
  compatibilitySignsSchema,
  compatibilityUsersSchema,
} from '../schemas/compatibility';
import { tarotQuerySchema } from '../schemas/tarot';
import { errorResponseSchema } from '../schemas/common';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

function jsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, { target: 'draft-7' });
}

function jsonBody(schemaName: string) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

function optionalJsonBody(schemaName: string) {
  return {
    ...jsonBody(schemaName),
    required: false,
  };
}

function success(description = 'Success') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { const: true },
            data: {},
          },
        },
      },
    },
  };
}

function problem(description = 'Error') {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  };
}

const schemas = {
  Login: loginSchema,
  Register: registerSchema,
  RefreshTokenBody: refreshTokenBodySchema,
  UpdateProfile: updateProfileSchema,
  CheckoutSync: checkoutSyncSchema,
  MobileCheckout: mobileCheckoutSchema,
  MobilePortal: mobilePortalSchema,
  RevenueCatWebhook: revenueCatWebhookSchema,
  NotificationPreferencesUpdate: notificationPreferencesUpdateSchema,
  PushToken: pushTokenSchema,
  DeletePushToken: deletePushTokenSchema,
  CitySearchQuery: citySearchQuerySchema,
  DailyHoroscopeParams: dailyHoroscopeParamsSchema,
  DailyHoroscopeQuery: dailyHoroscopeQuerySchema,
  CompatibilityQuery: compatibilityQuerySchema,
  CompatibilitySigns: compatibilitySignsSchema,
  CompatibilityUsers: compatibilityUsersSchema,
  TarotQuery: tarotQuerySchema,
  ErrorResponse: errorResponseSchema,
} satisfies Record<string, z.ZodType>;

router.get('/openapi.json', (c) => {
  const document = {
    openapi: '3.1.0',
    info: {
      title: 'Astralis API',
      version: '1.0.0',
      description: 'Versioned API contract for the Astralis Cloudflare Worker.',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/auth/login': {
        post: {
          tags: ['auth'],
          requestBody: jsonBody('Login'),
          responses: { 200: success(), 400: problem('Validation error'), 401: problem('Unauthorized') },
        },
      },
      '/auth/register': {
        post: {
          tags: ['auth'],
          requestBody: jsonBody('Register'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['auth'],
          requestBody: optionalJsonBody('RefreshTokenBody'),
          responses: { 200: success(), 401: problem('Invalid refresh token') },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['auth'],
          requestBody: optionalJsonBody('RefreshTokenBody'),
          responses: { 200: success() },
        },
      },
      '/auth/logout-all': {
        post: {
          tags: ['auth'],
          security: [{ bearerAuth: [] }],
          responses: { 200: success(), 401: problem('Unauthorized') },
        },
      },
      '/profile': {
        get: { tags: ['profile'], responses: { 200: success(), 401: problem('Unauthorized') } },
        patch: {
          tags: ['profile'],
          requestBody: jsonBody('UpdateProfile'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/billing/checkout/sync': {
        post: {
          tags: ['billing'],
          requestBody: jsonBody('CheckoutSync'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/billing/mobile/checkout': {
        post: {
          tags: ['billing'],
          requestBody: jsonBody('MobileCheckout'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/billing/mobile/portal': {
        post: {
          tags: ['billing'],
          requestBody: jsonBody('MobilePortal'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/notifications/preferences': {
        get: { tags: ['notifications'], responses: { 200: success() } },
        patch: {
          tags: ['notifications'],
          requestBody: jsonBody('NotificationPreferencesUpdate'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/horoscope/cities': {
        get: { tags: ['horoscope'], responses: { 200: success() } },
      },
      '/horoscope/daily/{sign}': {
        get: { tags: ['horoscope'], responses: { 200: success(), 400: problem('Validation error') } },
      },
      '/compatibility/signs': {
        post: {
          tags: ['compatibility'],
          requestBody: jsonBody('CompatibilitySigns'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/compatibility/users': {
        post: {
          tags: ['compatibility'],
          requestBody: jsonBody('CompatibilityUsers'),
          responses: { 200: success(), 400: problem('Validation error') },
        },
      },
      '/tarot': {
        get: { tags: ['tarot'], responses: { 200: success(), 400: problem('Validation error') } },
      },
    },
    components: {
      schemas: Object.fromEntries(
        Object.entries(schemas).map(([name, schema]) => [name, jsonSchema(schema)]),
      ),
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  };
  return c.json(document);
});

router.get('/docs', (c) =>
  c.html(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Astralis API</title></head>
  <body>
    <main>
      <h1>Astralis API</h1>
      <p>OpenAPI JSON is available at <a href="/api/v1/openapi.json">/api/v1/openapi.json</a>.</p>
    </main>
  </body>
</html>`),
);

export default router;
