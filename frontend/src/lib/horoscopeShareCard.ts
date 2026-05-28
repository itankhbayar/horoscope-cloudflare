import type { DailyHoroscope, ZodiacSign } from './types';
import { getZodiacInfo } from './zodiac';

export interface HoroscopeShareCardPayload {
  sign: ZodiacSign;
  signName: string;
  glyph: string;
  dateLabel: string;
  energyLine: string;
  preview: string;
  cosmicWeather?: string;
  palette: {
    top: string;
    mid: string;
    bottom: string;
    accent: string;
    glow: string;
  };
  variant: number;
}

const PALETTES = [
  { top: '#241542', mid: '#593f99', bottom: '#090817', accent: '#f4d98b', glow: '#b8a8ff' },
  { top: '#0d2638', mid: '#31567e', bottom: '#080b16', accent: '#a7e4c4', glow: '#9ec6ff' },
  { top: '#351634', mid: '#81435f', bottom: '#100815', accent: '#f3b6d6', glow: '#f4d98b' },
  { top: '#17271f', mid: '#4d7052', bottom: '#070d0a', accent: '#d9c97f', glow: '#9fe3c2' },
];

const ENERGY_OPENERS = [
  'Private pressure, clean signal.',
  'The subtext is louder than the plan.',
  'Soft truth, sharp timing.',
  'A quieter need wants language.',
  'The day tests what you keep performing.',
];

function seedFromSignAndDate(sign: ZodiacSign, dateISO: string): number {
  let h = 0;
  const text = `${sign}-${dateISO}`;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function clipSentence(value: string, maxLength: number): string {
  const clean = normalizeWhitespace(value);
  if (clean.length <= maxLength) return clean;
  const boundary = clean.slice(0, maxLength + 1).search(/[.!?]\s/);
  if (boundary > 48) return clean.slice(0, boundary + 1);
  const clipped = clean.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  return `${clipped}...`;
}

function formatDateLabel(dateISO: string, locale = 'en-US'): string {
  const date = new Date(`${dateISO}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function cosmicWeather(horoscope: DailyHoroscope): string | undefined {
  const ctx = horoscope.skyContext;
  if (!ctx) return undefined;
  const moon = getZodiacInfo(ctx.moonSign).name;
  const transit = ctx.focusTransit
    ? ` · ${ctx.focusTransit.transitBody} ${ctx.focusTransit.aspect} natal ${ctx.focusTransit.natalBody}`
    : '';
  return `Moon in ${moon} · ${ctx.moonPhase}${transit}`;
}

function energyLine(horoscope: DailyHoroscope, seed: number): string {
  const source = pick([horoscope.love, horoscope.career, horoscope.health, horoscope.overall], seed >> 2);
  const line = clipSentence(source, 82);
  if (line.length >= 34) return line;
  return pick(ENERGY_OPENERS, seed);
}

export function buildHoroscopeShareCardPayload(
  horoscope: DailyHoroscope,
  options: { locale?: string } = {},
): HoroscopeShareCardPayload {
  const info = getZodiacInfo(horoscope.sign);
  const seed = seedFromSignAndDate(horoscope.sign, horoscope.date);
  return {
    sign: horoscope.sign,
    signName: info.name,
    glyph: info.symbol,
    dateLabel: formatDateLabel(horoscope.date, options.locale),
    energyLine: energyLine(horoscope, seed),
    preview: clipSentence(horoscope.overall, 210),
    cosmicWeather: cosmicWeather(horoscope),
    palette: pick(PALETTES, seed >> 4),
    variant: seed % 4,
  };
}

function wrapSvgText(text: string, maxChars: number): string[] {
  const words = normalizeWhitespace(text).split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textLines(text: string, x: number, startY: number, size: number, lineHeight: number, maxChars: number, color: string, weight = 500): string {
  return wrapSvgText(text, maxChars)
    .slice(0, 4)
    .map((line, index) => `<text x="${x}" y="${startY + index * lineHeight}" text-anchor="middle" fill="${color}" font-size="${size}" font-family="Georgia, 'Times New Roman', serif" font-weight="${weight}">${escapeXml(line)}</text>`)
    .join('');
}

export function generateHoroscopeShareCardSvg(payload: HoroscopeShareCardPayload): string {
  const starOpacity = payload.variant % 2 === 0 ? '0.74' : '0.56';
  const weather = payload.cosmicWeather ?? 'Sky-aware daily reading';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${payload.palette.top}"/>
      <stop offset="54%" stop-color="${payload.palette.mid}"/>
      <stop offset="100%" stop-color="${payload.palette.bottom}"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="34%" r="58%">
      <stop offset="0%" stop-color="${payload.palette.glow}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${payload.palette.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#halo)"/>
  <circle cx="540" cy="590" r="350" fill="none" stroke="${payload.palette.accent}" stroke-width="3" opacity="0.42"/>
  <circle cx="540" cy="590" r="270" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <path d="M180 350 C 350 220, 720 220, 900 350" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="2"/>
  <circle cx="188" cy="246" r="5" fill="#ffffff" opacity="${starOpacity}"/>
  <circle cx="844" cy="306" r="4" fill="#ffffff" opacity="0.62"/>
  <circle cx="908" cy="1130" r="5" fill="${payload.palette.accent}" opacity="0.76"/>
  <circle cx="210" cy="1244" r="4" fill="#ffffff" opacity="0.46"/>
  <circle cx="812" cy="1548" r="3" fill="#ffffff" opacity="0.58"/>
  <text x="540" y="176" text-anchor="middle" fill="#ffffff" font-size="42" font-family="Georgia, 'Times New Roman', serif" font-weight="700" letter-spacing="3">ASTRALIS</text>
  <text x="540" y="242" text-anchor="middle" fill="${payload.palette.accent}" font-size="30" font-family="Arial, sans-serif" font-weight="700" letter-spacing="6">DAILY SKY CARD</text>
  <text x="540" y="522" text-anchor="middle" fill="#ffffff" font-size="178" font-family="Georgia, 'Times New Roman', serif">${payload.glyph}</text>
  <text x="540" y="664" text-anchor="middle" fill="#ffffff" font-size="78" font-family="Georgia, 'Times New Roman', serif" font-weight="700">${escapeXml(payload.signName)}</text>
  <text x="540" y="722" text-anchor="middle" fill="#d9d3ff" font-size="34" font-family="Arial, sans-serif" font-weight="700">${escapeXml(payload.dateLabel)}</text>
  <text x="540" y="872" text-anchor="middle" fill="${payload.palette.accent}" font-size="34" font-family="Arial, sans-serif" font-weight="800" letter-spacing="4">TODAY'S ENERGY</text>
  ${textLines(payload.energyLine, 540, 944, 48, 62, 31, '#ffffff', 700)}
  <line x1="260" x2="820" y1="1148" y2="1148" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  ${textLines(payload.preview, 540, 1242, 39, 55, 39, '#f4f1ff', 500)}
  <text x="540" y="1548" text-anchor="middle" fill="${payload.palette.accent}" font-size="27" font-family="Arial, sans-serif" font-weight="700">${escapeXml(weather)}</text>
  <text x="540" y="1712" text-anchor="middle" fill="#ffffff" font-size="34" font-family="Georgia, 'Times New Roman', serif" font-weight="700">Get your sky-aware reading</text>
  <text x="540" y="1762" text-anchor="middle" fill="#d9d3ff" font-size="25" font-family="Arial, sans-serif" font-weight="700">Astralis</text>
</svg>`;
}

export function horoscopeShareCardDataUrl(payload: HoroscopeShareCardPayload): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(generateHoroscopeShareCardSvg(payload))}`;
}

export function horoscopeShareCardFilename(payload: HoroscopeShareCardPayload, ext: 'png' | 'svg'): string {
  const slug = payload.dateLabel.replace(/\W+/g, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'today';
  return `astralis-${payload.sign}-${slug}-daily-card.${ext}`;
}

export function buildHoroscopeShareText(
  payload: HoroscopeShareCardPayload,
  appOrigin = 'https://astralis.app',
): string {
  const origin = appOrigin.replace(/\/$/, '');
  const url = `${origin}/horoscope/${payload.sign}/today`;
  return `${payload.energyLine}\n\n${payload.preview}\n\n${url}`;
}
