import type { GlobalSkyToday } from './types';
import { getZodiacInfo } from './zodiac';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function lines(text: string, startY: number, size: number, maxChars: number, fill = '#ffffff'): string {
  return wrap(text, maxChars)
    .slice(0, 4)
    .map((line, index) => `<text x="540" y="${startY + index * (size + 16)}" text-anchor="middle" fill="${fill}" font-size="${size}" font-family="Georgia, 'Times New Roman', serif" font-weight="600">${escapeXml(line)}</text>`)
    .join('');
}

export function generateGlobalSkyShareCardSvg(sky: GlobalSkyToday): string {
  const moon = getZodiacInfo(sky.moonSign);
  const tension = sky.atmosphere.tension;
  const accent = tension >= 62 ? '#f3b6d6' : '#f4d98b';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090817"/>
      <stop offset="46%" stop-color="#25245a"/>
      <stop offset="100%" stop-color="#0d2638"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="32%" r="58%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect width="1080" height="1920" fill="url(#halo)"/>
  <circle cx="540" cy="565" r="318" fill="rgba(255,255,255,0.04)" stroke="${accent}" stroke-width="3" opacity="0.72"/>
  <circle cx="210" cy="250" r="5" fill="#fff" opacity="0.68"/>
  <circle cx="880" cy="320" r="4" fill="#fff" opacity="0.52"/>
  <circle cx="810" cy="1390" r="5" fill="${accent}" opacity="0.74"/>
  <text x="540" y="170" text-anchor="middle" fill="#ffffff" font-size="42" font-family="Georgia, 'Times New Roman', serif" font-weight="700" letter-spacing="3">ASTRALIS</text>
  <text x="540" y="244" text-anchor="middle" fill="${accent}" font-size="30" font-family="Arial, sans-serif" font-weight="800" letter-spacing="5">GLOBAL SKY TODAY</text>
  <text x="540" y="530" text-anchor="middle" fill="#ffffff" font-size="150" font-family="Georgia, 'Times New Roman', serif">&#9789;</text>
  <text x="540" y="672" text-anchor="middle" fill="#ffffff" font-size="62" font-family="Georgia, 'Times New Roman', serif" font-weight="700">Moon in ${escapeXml(moon.name)}</text>
  <text x="540" y="730" text-anchor="middle" fill="#d9d3ff" font-size="32" font-family="Arial, sans-serif" font-weight="700">${escapeXml(sky.moonPhase)}</text>
  ${lines(sky.headline, 910, 50, 32, '#ffffff')}
  <line x1="260" x2="820" y1="1155" y2="1155" stroke="rgba(255,255,255,0.26)" stroke-width="2"/>
  ${lines(sky.shareLine, 1260, 38, 42, '#f4f1ff')}
  <text x="540" y="1620" text-anchor="middle" fill="${accent}" font-size="28" font-family="Arial, sans-serif" font-weight="800">tension ${sky.atmosphere.tension} | clarity ${sky.atmosphere.clarity} | intimacy ${sky.atmosphere.intimacy}</text>
  <text x="540" y="1740" text-anchor="middle" fill="#ffffff" font-size="34" font-family="Georgia, 'Times New Roman', serif" font-weight="700">Get your sky-aware reading</text>
</svg>`;
}

export function globalSkyShareCardDataUrl(sky: GlobalSkyToday): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(generateGlobalSkyShareCardSvg(sky))}`;
}
