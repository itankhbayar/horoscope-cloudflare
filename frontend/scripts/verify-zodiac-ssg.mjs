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
  if (!condition) {
    throw new Error(message);
  }
}

for (const slug of signs) {
  const file = join(distDir, 'horoscope', slug, 'index.html');
  assert(existsSync(file), `Missing ${file}`);
  const html = readFileSync(file, 'utf8');
  const signName = slug[0].toUpperCase() + slug.slice(1);
  assert(html.includes(`<title>${signName} Horoscope Today</title>`), `${slug}: missing SEO title`);
  assert(html.includes('<meta name="description"'), `${slug}: missing meta description`);
  assert(html.includes(`<link rel="canonical"`), `${slug}: missing canonical`);
  assert(html.includes('application/ld+json'), `${slug}: missing JSON-LD`);
  assert(html.includes('/register'), `${slug}: missing signup CTA`);
  assert(html.includes('/premium'), `${slug}: missing premium CTA`);
}

const sitemap = readFileSync(join(distDir, 'sitemap.xml'), 'utf8');
for (const slug of signs) {
  assert(sitemap.includes(`/horoscope/${slug}`), `sitemap missing ${slug}`);
}
for (const slug of legalRoutes) {
  const file = join(distDir, slug, 'index.html');
  assert(existsSync(file), `Missing ${file}`);
  const html = readFileSync(file, 'utf8');
  assert(html.includes('<link rel="canonical"'), `${slug}: missing canonical`);
  assert(html.includes('application/ld+json'), `${slug}: missing JSON-LD`);
  assert(sitemap.includes(`/${slug}`), `sitemap missing ${slug}`);
}

const robots = readFileSync(join(distDir, 'robots.txt'), 'utf8');
assert(robots.includes('Sitemap:'), 'robots.txt missing sitemap directive');

console.log(
  `Verified ${signs.length} prerendered zodiac pages, ${legalRoutes.length} legal pages, sitemap.xml, and robots.txt`,
);
