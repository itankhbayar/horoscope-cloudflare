import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  revokeObjectPreview,
  validateAvatarFile,
} from './useAvatarUpload';

describe('validateAvatarFile', () => {
  it('accepts allowed image types within size limit', () => {
    const file = new File([new Uint8Array(100)], 'a.png', { type: 'image/png' });
    expect(validateAvatarFile(file)).toBeNull();
  });

  it('rejects disallowed mime types', () => {
    const file = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' });
    expect(validateAvatarFile(file)).toBe('Avatar must be jpeg, png, or webp.');
  });

  it('rejects files larger than 5MB', () => {
    const file = new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    expect(validateAvatarFile(file)).toBe('Avatar must be 5MB or smaller.');
  });

  it('documents allowed mime set', () => {
    expect([...ALLOWED_AVATAR_MIME_TYPES]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });
});

describe('revokeObjectPreview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('revokes blob URLs only', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    revokeObjectPreview('blob:https://example.com/abc');
    expect(revoke).toHaveBeenCalledWith('blob:https://example.com/abc');
    revoke.mockClear();
    revokeObjectPreview('https://cdn.example/avatar.png');
    expect(revoke).not.toHaveBeenCalled();
    revokeObjectPreview(null);
    expect(revoke).not.toHaveBeenCalled();
  });
});
