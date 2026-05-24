import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const signs = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];
const legalRoutes = ['privacy', 'terms', 'delete-account'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSeoHtml(file, label) {
  assert(existsSync(file), `Missing ${file}`);
  const html = readFileSync(file, 'utf8');
  assert(html.includes('<title>') && !html.includes('Astralis Â·'), `${label}: missing specific title`);
  assert(html.includes('<meta name="description"'), `${label}: missing meta description`);
  assert(html.includes('<meta name="robots" content="index,follow"'), `${label}: missing index robots`);
  assert(!html.includes('noindex'), `${label}: public page contains noindex`);
  assert(html.includes('<link rel="canonical"'), `${label}: missing canonical`);
  assert(html.includes('property="og:title"'), `${label}: missing Open Graph title`);
  assert(html.includes('property="og:image"'), `${label}: missing Open Graph image`);
  assert(html.includes('name="twitter:card"'), `${label}: missing Twitter card`);
  assert(html.includes('application/ld+json'), `${label}: missing JSON-LD`);
  return html;
}

for (const slug of signs) {
  const signName = slug[0].toUpperCase() + slug.slice(1);
  const html = assertSeoHtml(join(distDir, 'horoscope', slug, 'index.html'), slug);
  assert(html.includes(`${signName} Real Sky Reading Today`), `${slug}: missing horoscope content`);
  assert(html.includes('Astronomy-accurate preview'), `${slug}: missing textual horoscope preview`);
  assert(html.includes('Birthplace-aware charting'), `${slug}: missing birthplace-aware positioning`);
  assert(html.includes(`/og/horoscope-${slug}.svg`), `${slug}: missing dynamic OG image`);

  const todayHtml = assertSeoHtml(join(distDir, 'horoscope', slug, 'today', 'index.html'), `${slug}/today`);
  assert(todayHtml.includes(`${signName} Real Sky Reading Today`), `${slug}/today: missing today content`);
}

for (const slug of legalRoutes) {
  assertSeoHtml(join(distDir, slug, 'index.html'), slug);
}

const compatibilityHtml = assertSeoHtml(
  join(distDir, 'compatibility', 'aries', 'leo', 'index.html'),
  'compatibility/aries/leo',
);
assert(compatibilityHtml.includes('Aries and Leo Compatibility'), 'compatibility page missing content');
assert(compatibilityHtml.includes('birthplace-aware chart overlays'), 'compatibility page missing chart-overlay positioning');

const landingHtml = assertSeoHtml(join(distDir, 'index.html'), 'landing');
assert(landingHtml.includes('Astrology mapped to the real sky.'), 'landing page missing hero content');
assert(landingHtml.includes('Why Astralis feels different'), 'landing page missing differentiation content');
assert(landingHtml.includes('Birthplace-aware charting'), 'landing page missing birthplace content');
assert(landingHtml.includes("Mongolia's vast night sky"), 'landing page missing Mongolia-inspired positioning');

const sitemap = readFileSync(join(distDir, 'sitemap.xml'), 'utf8');
for (const slug of signs) {
  assert(sitemap.includes(`/horoscope/${slug}`), `sitemap missing ${slug}`);
  assert(sitemap.includes(`/horoscope/${slug}/today`), `sitemap missing ${slug}/today`);
}
for (const slug of legalRoutes) assert(sitemap.includes(`/${slug}`), `sitemap missing ${slug}`);
assert(sitemap.includes('/compatibility/aries/leo'), 'sitemap missing compatibility pages');
assert(sitemap.includes('<lastmod>'), 'sitemap missing lastmod values');

const robots = readFileSync(join(distDir, 'robots.txt'), 'utf8');
assert(robots.includes('Allow: /'), 'robots.txt missing public allow');
assert(robots.includes('Disallow: /admin'), 'robots.txt missing admin block');
assert(robots.includes('Disallow: /api'), 'robots.txt missing api block');
assert(robots.includes('Disallow: /profile'), 'robots.txt missing account block');
assert(robots.includes('Sitemap:'), 'robots.txt missing sitemap directive');

assert(existsSync(join(distDir, 'og', 'default.svg')), 'missing default OG image');
assert(existsSync(join(distDir, 'og', 'horoscope-aries.svg')), 'missing dynamic horoscope OG image');

console.log(
  `Verified ${signs.length * 2} prerendered horoscope pages, compatibility pages, legal pages, sitemap.xml, robots.txt, and OG images`,
);
