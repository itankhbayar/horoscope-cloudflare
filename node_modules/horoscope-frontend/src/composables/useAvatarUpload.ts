import { computed, onUnmounted, ref, type Ref } from 'vue';

export const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function revokeObjectPreview(url: string | null | undefined): void {
  if (!url || !url.startsWith('blob:')) return;
  URL.revokeObjectURL(url);
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
    return 'Avatar must be jpeg, png, or webp.';
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return 'Avatar must be 5MB or smaller.';
  }
  return null;
}

export interface UseAvatarUploadOptions {
  upload: (file: File) => Promise<string>;
  getServerAvatarUrl: () => string | null | undefined;
  uploading?: Ref<boolean>;
}

export function useAvatarUpload(options: UseAvatarUploadOptions) {
  const previewUrl = ref<string | null>(null);
  const inputEl = ref<HTMLInputElement | null>(null);
  const error = ref<string | undefined>(undefined);

  const resolvedAvatar = computed(
    () => previewUrl.value || options.getServerAvatarUrl() || null,
  );

  function clearPreview(): void {
    revokeObjectPreview(previewUrl.value);
    previewUrl.value = null;
  }

  function reset(): void {
    clearPreview();
    error.value = undefined;
    if (inputEl.value) {
      inputEl.value.value = '';
    }
  }

  function openPicker(): void {
    inputEl.value?.click();
  }

  async function onFileSelected(event: Event): Promise<void> {
    error.value = undefined;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      error.value = validationError;
      return;
    }

    revokeObjectPreview(previewUrl.value);
    previewUrl.value = URL.createObjectURL(file);
    try {
      const avatarUrl = await options.upload(file);
      revokeObjectPreview(previewUrl.value);
      previewUrl.value = avatarUrl;
    } catch {
      revokeObjectPreview(previewUrl.value);
      previewUrl.value = null;
    } finally {
      if (inputEl.value) {
        inputEl.value.value = '';
      }
    }
  }

  onUnmounted(() => {
    revokeObjectPreview(previewUrl.value);
  });

  return {
    previewUrl,
    inputEl,
    error,
    resolvedAvatar,
    onFileSelected,
    reset,
    openPicker,
    clearPreview,
  };
}
