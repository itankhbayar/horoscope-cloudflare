import type { HoroscopeShareCardPayload } from './horoscopeShareCard';
import { generateHoroscopeShareCardSvg, horoscopeShareCardDataUrl } from './horoscopeShareCard';

export interface WebShareResult {
  method: 'native' | 'download';
}

interface WebShareDeps {
  navigator?: Navigator;
  document?: Document;
  ImageCtor?: typeof Image;
}

function svgBlob(payload: HoroscopeShareCardPayload): Blob {
  return new Blob([generateHoroscopeShareCardSvg(payload)], { type: 'image/svg+xml;charset=utf-8' });
}

async function svgToPngFile(payload: HoroscopeShareCardPayload, deps: Required<Pick<WebShareDeps, 'document' | 'ImageCtor'>>): Promise<File> {
  const url = URL.createObjectURL(svgBlob(payload));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new deps.ImageCtor();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('share_card_image_load_failed'));
      image.src = url;
    });
    const canvas = deps.document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('share_card_canvas_unavailable');
    ctx.drawImage(img, 0, 0, 1080, 1920);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('share_card_png_failed'));
      }, 'image/png', 0.94);
    });
    return new File([blob], `astralis-${payload.sign}-${payload.dateLabel.replace(/\W+/g, '-').toLowerCase()}.png`, {
      type: 'image/png',
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadSvg(payload: HoroscopeShareCardPayload, documentRef: Document): void {
  const anchor = documentRef.createElement('a');
  anchor.href = horoscopeShareCardDataUrl(payload);
  anchor.download = `astralis-${payload.sign}-daily-card.svg`;
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

  if (navigatorRef?.share && documentRef && ImageCtor && typeof File !== 'undefined') {
    try {
      const file = await svgToPngFile(payload, { document: documentRef, ImageCtor });
      const files = [file];
      if (!navigatorRef.canShare || navigatorRef.canShare({ files })) {
        await navigatorRef.share({
          title: `${payload.signName} daily horoscope`,
          text: payload.energyLine,
          files,
        });
        return { method: 'native' };
      }
    } catch {
      // Fall through to SVG download; sharing should stay useful even when PNG conversion is unavailable.
    }
  }

  if (!documentRef) throw new Error('share_card_download_unavailable');
  downloadSvg(payload, documentRef);
  return { method: 'download' };
}
