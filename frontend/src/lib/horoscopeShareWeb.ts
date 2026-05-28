import type { HoroscopeShareCardPayload } from './horoscopeShareCard';
import {
  buildHoroscopeShareText,
  generateHoroscopeShareCardSvg,
  horoscopeShareCardDataUrl,
  horoscopeShareCardFilename,
} from './horoscopeShareCard';
import { isValidShareImageFile, MIN_SHARE_IMAGE_BYTES, nativeShareWithImageFallback } from './webShare';

export interface WebShareResult {
  method: 'native' | 'download';
}

interface WebShareDeps {
  navigator?: Navigator;
  document?: Document;
  ImageCtor?: typeof Image;
  appOrigin?: string;
}

function svgBlob(payload: HoroscopeShareCardPayload): Blob {
  return new Blob([generateHoroscopeShareCardSvg(payload)], { type: 'image/svg+xml;charset=utf-8' });
}

async function svgToPngFile(
  payload: HoroscopeShareCardPayload,
  deps: Required<Pick<WebShareDeps, 'document' | 'ImageCtor'>>,
): Promise<File> {
  const url = URL.createObjectURL(svgBlob(payload));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new deps.ImageCtor();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('share_card_image_load_failed'));
      image.src = url;
    });
    if (typeof img.decode === 'function') {
      await img.decode();
    }
    if (img.naturalWidth < 1 || img.naturalHeight < 1) {
      throw new Error('share_card_image_empty');
    }
    const canvas = deps.document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('share_card_canvas_unavailable');
    ctx.drawImage(img, 0, 0, 1080, 1920);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value && value.size >= MIN_SHARE_IMAGE_BYTES) resolve(value);
        else reject(new Error('share_card_png_failed'));
      }, 'image/png', 0.94);
    });
    return new File([blob], horoscopeShareCardFilename(payload, 'png'), { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadSvg(payload: HoroscopeShareCardPayload, documentRef: Document): void {
  const anchor = documentRef.createElement('a');
  anchor.href = horoscopeShareCardDataUrl(payload);
  anchor.download = horoscopeShareCardFilename(payload, 'svg');
  anchor.rel = 'noopener';
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function shareHoroscopeCardOnWeb(
  payload: HoroscopeShareCardPayload,
  deps: WebShareDeps = {},
): Promise<WebShareResult> {
  const navigatorRef = deps.navigator ?? globalThis.navigator;
  const documentRef = deps.document ?? globalThis.document;
  const ImageCtor = deps.ImageCtor ?? globalThis.Image;
  const appOrigin = deps.appOrigin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://astralis.app');
  const shareText = buildHoroscopeShareText(payload, appOrigin);
  const title = `${payload.signName} · Astralis`;

  const nativeShare = navigatorRef
    ? (navigatorRef as Navigator & { share?: Navigator['share'] }).share
    : undefined;
  if (typeof nativeShare === 'function' && documentRef && ImageCtor && typeof File !== 'undefined') {
    let pngFile: File | null = null;
    try {
      pngFile = await svgToPngFile(payload, { document: documentRef, ImageCtor });
      if (!isValidShareImageFile(pngFile)) pngFile = null;
    } catch {
      pngFile = null;
    }

    try {
      await nativeShareWithImageFallback(navigatorRef, {
        title,
        text: shareText,
        file: pngFile,
      });
      return { method: 'native' };
    } catch {
      // Fall through to SVG download.
    }
  }

  if (!documentRef) throw new Error('share_card_download_unavailable');
  downloadSvg(payload, documentRef);
  return { method: 'download' };
}
