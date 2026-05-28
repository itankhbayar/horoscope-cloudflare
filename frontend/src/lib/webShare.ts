/** Minimum PNG payload size; smaller blobs are treated as failed renders. */
export const MIN_SHARE_IMAGE_BYTES = 256;

export function isValidShareImageFile(file: File | null | undefined): file is File {
  if (!file || file.size < MIN_SHARE_IMAGE_BYTES) return false;
  return /\.(png|jpe?g|webp)$/i.test(file.name);
}

export function isShareUserCancelled(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export type NativeShareOutcome = 'file' | 'text';

/**
 * Share with an image when the file is valid; otherwise text-only (no empty attachments).
 * Do not pass `url` together with `files` — some Windows mail clients create a broken attachment.
 */
export async function nativeShareWithImageFallback(
  navigatorRef: Navigator,
  options: {
    title: string;
    text: string;
    file?: File | null;
    url?: string;
  },
): Promise<NativeShareOutcome> {
  const { title, text, file, url } = options;
  const shareFile = isValidShareImageFile(file) ? file : null;

  if (shareFile && (!navigatorRef.canShare || navigatorRef.canShare({ files: [shareFile] }))) {
    try {
      const nativeShare = (navigatorRef as Navigator & { share?: Navigator['share'] }).share;
      if (typeof nativeShare !== 'function') throw new Error('native_share_unavailable');
      await nativeShare.call(navigatorRef, { title, text, files: [shareFile] });
      return 'file';
    } catch (err) {
      if (isShareUserCancelled(err)) throw err;
    }
  }

  const nativeShare = (navigatorRef as Navigator & { share?: Navigator['share'] }).share;
  if (typeof nativeShare !== 'function') {
    throw new Error('native_share_unavailable');
  }

  await nativeShare.call(navigatorRef, {
    title,
    text,
    ...(url ? { url } : {}),
  });
  return 'text';
}
