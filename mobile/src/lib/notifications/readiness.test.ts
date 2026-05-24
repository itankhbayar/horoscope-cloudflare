import { describe, expect, it } from 'vitest';
import { getNotificationReadiness } from './readiness';

describe('notification readiness', () => {
  it('blocks push registration on simulators', () => {
    expect(getNotificationReadiness({ isDevice: false, projectId: 'project-1' })).toMatchObject({
      canRequestPush: false,
      reason: expect.stringContaining('physical device'),
    });
  });

  it('blocks push registration without an Expo project id', () => {
    expect(getNotificationReadiness({ isDevice: true, projectId: null })).toMatchObject({
      canRequestPush: false,
      reason: expect.stringContaining('Expo projectId is missing'),
    });
  });

  it('allows explicit user opt-in when device and project id are ready', () => {
    expect(getNotificationReadiness({ isDevice: true, projectId: 'project-1' })).toEqual({
      canRequestPush: true,
      reason: null,
    });
  });
});
