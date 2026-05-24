import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const siteUrl = (
  process.env.VITE_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  'https://horoscope-frontend.pages.dev'
).replace(/\/$/, '');
const todayISO = new Date().toISOString().slice(0, 10);

const zodiacSigns = [
  ['aries', 'Aries', 'Mar 21 - Apr 19', 'Fire', 'Aries moves first, trusts momentum, and turns instinct into action.', 'Today favors decisive conversations, brave prioritization, and cleaner boundaries around distractions.'],
  ['taurus', 'Taurus', 'Apr 20 - May 20', 'Earth', 'Taurus builds slowly, beautifully, and with staying power.', 'Today highlights money, comfort, loyalty, and the routines that make your nervous system feel safe.'],
  ['gemini', 'Gemini', 'May 21 - Jun 20', 'Air', 'Gemini thrives on pattern, wit, and discovery.', 'Today brings focus to conversations, choices, and the signal hidden inside too much information.'],
  ['cancer', 'Cancer', 'Jun 21 - Jul 22', 'Water', 'Cancer reads the emotional weather before anyone says a word.', 'Today centers home, belonging, intuition, and the kind of softness that still has a spine.'],
  ['leo', 'Leo', 'Jul 23 - Aug 22', 'Fire', 'Leo brings warmth, courage, and creative gravity.', 'Today spotlights confidence, romance, creativity, and the moment where generosity becomes leadership.'],
  ['virgo', 'Virgo', 'Aug 23 - Sep 22', 'Earth', 'Virgo notices the detail that changes the whole system.', 'Today focuses on work, wellness, organization, and the one improvement that makes everything easier.'],
  ['libra', 'Libra', 'Sep 23 - Oct 22', 'Air', 'Libra seeks harmony that is honest, not decorative.', 'Today emphasizes partnership, aesthetics, diplomacy, and the balance between pleasing others and honoring yourself.'],
  ['scorpio', 'Scorpio', 'Oct 23 - Nov 21', 'Water', 'Scorpio sees beneath the surface and knows when something is ready to transform.', 'Today points to trust, intimacy, release, and the power that returns when you stop negotiating with what is done.'],
  ['sagittarius', 'Sagittarius', 'Nov 22 - Dec 21', 'Fire', 'Sagittarius needs meaning, movement, and a horizon.', 'Today highlights travel, learning, optimism, and the truth that wants to become a plan.'],
  ['capricorn', 'Capricorn', 'Dec 22 - Jan 19', 'Earth', 'Capricorn understands time, effort, and earned confidence.', 'Today supports structure, ambition, and progress you can actually measure.'],
  ['aquarius', 'Aquarius', 'Jan 20 - Feb 18', 'Air', 'Aquarius brings future-facing clarity and refuses stale patterns.', 'Today spotlights friendship, innovation, independence, and the idea that becomes useful when shared.'],
  ['pisces', 'Pisces', 'Feb 19 - Mar 20', 'Water', 'Pisces feels the invisible thread between dream, memory, and meaning.', 'Today centers rest, creativity, compassion, and the quiet sign that tells you what your spirit already knows.'],
].map(([slug, name, dates, element, intro, preview]) => ({ slug, name, dates, element, intro, preview }));

const legalPages = [
  ['privacy', 'Privacy Policy', 'Privacy Policy for Astralis covering account data, horoscope preferences, billing, notifications, analytics, and deletion.'],
  ['terms', 'Terms of Service', 'Astralis Terms of Service covering subscriptions, auto-renewal, refunds, acceptable use, and liability limits.'],
  ['delete-account', 'Delete Your Account', 'How to delete your Astralis account and remove profile, horoscope, chart, notification, and personalized cached data.'],
].map(([slug, title, description]) => ({ slug, title, description }));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonLd(data) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

function head({ title, description, canonical, imagePath = '/og/default.svg', type = 'website', structuredData }) {
  const image = `${siteUrl}${imagePath}`;
  return `<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="icon" href="/favicon.ico">
    <meta property="og:type" content="${escapeHtml(type)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <script type="application/ld+json">${jsonLd(structuredData)}</script>`;
}

function style() {
  return `<style>
    :root{color-scheme:dark;--bg:#050510;--card:#12142a;--text:#f5f2ff;--muted:#bbc0e4;--gold:#d4af37;--line:rgba(212,175,55,.24)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 78% 0%,rgba(139,107,255,.25),transparent 32%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.58}
    a{color:inherit}.page{width:min(1060px,100%);margin:0 auto;padding:28px 18px 54px}.hero{min-height:72vh;display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.72fr);gap:34px;align-items:center;border-bottom:1px solid rgba(255,255,255,.09)}
    .kicker{color:var(--gold);font-weight:800;letter-spacing:.09em;text-transform:uppercase;font-size:.78rem}h1{font-size:clamp(2.55rem,7vw,5.4rem);line-height:.98;margin:.2rem 0 1rem}h2{font-size:clamp(1.55rem,4vw,2.6rem);line-height:1.1;margin:0 0 .7rem}p{color:var(--muted);max-width:72ch}.lede{font-size:clamp(1.05rem,2vw,1.28rem)}
    .orb{aspect-ratio:1;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;background:linear-gradient(145deg,rgba(212,175,55,.18),rgba(139,107,255,.16));font-size:clamp(3rem,10vw,6rem);color:var(--gold)}
    .band,.card{border:1px solid rgba(255,255,255,.11);background:rgba(18,20,42,.8);border-radius:20px;padding:clamp(18px,4vw,28px)}section{margin-top:24px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:8px 12px;text-decoration:none;color:var(--muted)}.links a:hover{color:var(--text);border-color:var(--gold)}
    @media(max-width:760px){.hero,.grid{grid-template-columns:1fr}.hero{min-height:auto;padding:32px 0}.orb{width:180px}}
  </style>`;
}

function html({ title, description, canonical, imagePath, type, structuredData, body }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    ${head({ title, description, canonical, imagePath, type, structuredData })}
    ${style()}
  </head>
  <body>${body}</body>
</html>`;
}

function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Astralis',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/horoscope/{search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

function horoscopeHtml(sign, { today = false } = {}) {
  const route = `/horoscope/${sign.slug}${today ? '/today' : ''}`;
  const title = `${sign.name} Real Sky Reading Today${today ? ` (${todayISO})` : ''} | Astralis`;
  const description = `Read the ${today ? `${todayISO} ` : ''}${sign.name} real-sky astrology preview from Astralis, built on real planetary positions and birthplace-aware charting.`;
  const canonical = `${siteUrl}${route}`;
  const structuredData = [
    websiteLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      datePublished: todayISO,
      dateModified: todayISO,
      image: `${siteUrl}/og/horoscope-${sign.slug}.svg`,
      author: { '@type': 'Organization', name: 'Astralis' },
      publisher: { '@type': 'Organization', name: 'Astralis' },
      mainEntityOfPage: canonical,
    },
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Real Sky Readings', path: '/horoscope/aries' },
      { name: `${sign.name} Sky Reading`, path: route },
    ]),
  ];
  const otherSigns = zodiacSigns
    .filter((item) => item.slug !== sign.slug)
    .map((item) => `<a href="/horoscope/${item.slug}">${escapeHtml(item.name)}</a>`)
    .join('');

  return html({
    title,
    description,
    canonical,
    imagePath: `/og/horoscope-${sign.slug}.svg`,
    type: 'article',
    structuredData,
    body: `<main class="page">
      <article class="hero">
        <div>
          <p class="kicker">${escapeHtml(sign.dates)} · ${escapeHtml(sign.element)} sign</p>
          <h1>${escapeHtml(sign.name)} Real Sky Reading Today</h1>
          <p class="lede">${escapeHtml(sign.intro)}</p>
          <p>${escapeHtml(sign.preview)}</p>
        </div>
        <div class="orb" aria-hidden="true">${escapeHtml(sign.name.slice(0, 3).toUpperCase())}</div>
      </article>
      <section class="band">
        <p class="kicker">Astronomy-accurate preview</p>
        <h2>What today asks of ${escapeHtml(sign.name)}</h2>
        <p>${escapeHtml(sign.preview)} Create your free Astralis chart for guidance shaped by your birth profile, calculated placements, the moving sky, and the horizon above your birthplace.</p>
      </section>
      <section class="grid">
        <article class="card"><h2>Real sky calculations</h2><p>Astralis starts with planetary positions for the date, then reads them through a calm astrological lens.</p></article>
        <article class="card"><h2>Birthplace-aware charting</h2><p>Your birth location matters because the sky is local; private charts can map houses and angles to that place.</p></article>
        <article class="card"><h2>Calm premium astrology</h2><p>Premium layers focus on deeper chart intelligence, transits, and compatibility without aggressive urgency.</p></article>
      </section>
      <section>
        <h2>Explore other zodiac horoscopes</h2>
        <nav class="links" aria-label="Zodiac horoscope pages">${otherSigns}</nav>
      </section>
    </main>`,
  });
}

function compatibilityHtml(signA, signB) {
  const route = `/compatibility/${signA.slug}/${signB.slug}`;
  const title = `${signA.name} and ${signB.name} Compatibility | Astralis`;
  const description = `Explore ${signA.name} and ${signB.name} compatibility with Astralis, where public sign dynamics can deepen into birthplace-aware chart overlays after sign-in.`;
  const canonical = `${siteUrl}${route}`;
  return html({
    title,
    description,
    canonical,
    imagePath: '/og/default.svg',
    type: 'article',
    structuredData: [
      websiteLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: title,
        description,
        dateModified: todayISO,
        mainEntityOfPage: canonical,
      },
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Compatibility', path: '/compatibility/aries/leo' },
        { name: `${signA.name} and ${signB.name}`, path: route },
      ]),
    ],
    body: `<main class="page">
      <article class="hero">
        <div>
          <p class="kicker">Chart-aware compatibility</p>
          <h1>${escapeHtml(signA.name)} and ${escapeHtml(signB.name)} Compatibility</h1>
          <p class="lede">${escapeHtml(description)}</p>
          <p>Astralis uses sign qualities as a starting point, then adds private chart overlays and real-sky context after sign-in for deeper relationship guidance.</p>
        </div>
        <div class="orb" aria-hidden="true">${escapeHtml(signA.name[0])}+${escapeHtml(signB.name[0])}</div>
      </article>
      <section class="grid">
        <article class="card"><h2>Love</h2><p>${escapeHtml(signA.name)} and ${escapeHtml(signB.name)} can build connection by honoring each sign's rhythm before chart overlays add more context.</p></article>
        <article class="card"><h2>Birthplace context</h2><p>Private compatibility can compare calculated charts when birth data is available, instead of relying only on sun signs.</p></article>
        <article class="card"><h2>Communication</h2><p>Clear language matters most when the signs approach conflict, planning, or affection differently.</p></article>
      </section>
    </main>`,
  });
}

function legalHtml(page) {
  const canonical = `${siteUrl}/${page.slug}`;
  const extra =
    page.slug === 'privacy'
      ? `<section class="grid">
        <article class="card"><h2>Lawful basis</h2><p>Birth date, optional birth time, and birth location are processed with your acknowledgment to generate astrology insights. Optional analytics are used with consent where required.</p></article>
        <article class="card"><h2>Analytics and payments</h2><p>Astralis may use PostHog for product analytics, Sentry for error tracking, and Stripe or app stores for payment processing. Analytics avoids birth time, birth location, chart placements, passwords, tokens, and payment details.</p></article>
        <article class="card"><h2>Retention and rights</h2><p>Account deletion removes account, birth profile, natal chart, notification preferences, and push tokens, while payment processors may retain billing records for legal obligations. You may request access, export, correction, deletion, or consent withdrawal.</p></article>
      </section>`
      : '';
  return html({
    title: `${page.title} | Astralis`,
    description: page.description,
    canonical,
    structuredData: [websiteLd(), { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, description: page.description, url: canonical }],
    body: `<main class="page"><article class="band"><p class="kicker">Astralis</p><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p><p>Read this public policy page for account, billing, subscription, privacy, and support information related to Astralis.</p><nav class="links"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a><a href="/delete-account">Delete Account</a></nav></article>${extra}</main>`,
  });
}

function writeFileRoute(route, content) {
  const routeDir = join(distDir, ...route.split('/').filter(Boolean));
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(join(routeDir, 'index.html'), content, 'utf8');
}

function ogSvg(title, subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#050510"/><stop offset=".55" stop-color="#17183a"/><stop offset="1" stop-color="#3b2f79"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="930" cy="120" r="210" fill="#d4af37" opacity=".16"/>
  <circle cx="150" cy="520" r="260" fill="#8b6bff" opacity=".2"/>
  <text x="80" y="120" fill="#d4af37" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="5">ASTRALIS</text>
  <text x="80" y="315" fill="#f5f2ff" font-family="Georgia, serif" font-size="78" font-weight="700">${escapeHtml(title)}</text>
  <text x="84" y="392" fill="#c9cff4" font-family="Arial, sans-serif" font-size="34">${escapeHtml(subtitle)}</text>
</svg>`;
}

function writeOgImages() {
  const ogDir = join(distDir, 'og');
  mkdirSync(ogDir, { recursive: true });
  writeFileSync(join(ogDir, 'default.svg'), ogSvg('Real Sky Astrology', 'Birthplace-aware charts and calm premium rituals'), 'utf8');
  for (const sign of zodiacSigns) {
    writeFileSync(join(ogDir, `horoscope-${sign.slug}.svg`), ogSvg(`${sign.name} Sky Reading`, 'Mapped to the real sky'), 'utf8');
  }
}

function writeSitemap() {
  const routes = [
    '/',
    '/login',
    '/register',
    '/premium',
    ...legalPages.map((page) => `/${page.slug}`),
    ...zodiacSigns.flatMap((sign) => [`/horoscope/${sign.slug}`, `/horoscope/${sign.slug}/today`]),
    ...zodiacSigns.flatMap((a) => zodiacSigns.map((b) => `/compatibility/${a.slug}/${b.slug}`)),
  ];
  const urls = routes.map((route) => `  <url>
    <loc>${siteUrl}${route === '/' ? '' : route}</loc>
    <lastmod>${todayISO}</lastmod>
    <changefreq>${route.includes('/horoscope/') ? 'daily' : 'weekly'}</changefreq>
    <priority>${route.includes('/horoscope/') ? '0.8' : route.includes('/compatibility/') ? '0.6' : '0.5'}</priority>
  </url>`).join('\n');
  writeFileSync(join(distDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 'utf8');
}

function writeRobots() {
  writeFileSync(join(distDir, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /profile
Disallow: /chart
Disallow: /tarot
Disallow: /premium/success
Disallow: /premium/cancel
Disallow: /account

Sitemap: ${siteUrl}/sitemap.xml
`, 'utf8');
}

function landingStaticMarkup() {
  return `<main class="page">
    <section class="hero">
      <div>
        <p class="kicker">Astronomy-accurate astrology</p>
        <h1>Astrology mapped to the real sky.</h1>
        <p class="lede">Astralis begins with real planetary positions, your birth time, and the sky above your birthplace, then turns that map into calm, emotionally precise guidance.</p>
        <p>Built beneath Mongolia's vast night sky and designed for a global audience, Astralis makes astrology feel more personal by anchoring readings to the sky that was actually above you.</p>
      </div>
      <div class="orb" aria-hidden="true">AST</div>
    </section>
    <section class="band">
      <p class="kicker">Why Astralis feels different</p>
      <h2>Less generic horoscope. More sky-aware interpretation.</h2>
      <p>Astralis uses real planetary positions, birthplace-aware charting, calm premium interpretation, and a Mongolia-inspired identity to explain why today may feel the way it does.</p>
    </section>
    <section class="grid">
      <article class="card"><h2>Real planetary positions</h2><p>Daily readings can reference the Sun, Moon, Moon phase, and available transit signals instead of relying on generic templates.</p></article>
      <article class="card"><h2>Birthplace-aware charting</h2><p>Latitude and longitude help locate the horizon, angles, and houses that make your chart local.</p></article>
      <article class="card"><h2>Today's sky</h2><p>Astralis explains how the moving sky interacts with natal placements when those calculated fields are available.</p></article>
    </section>
    <section class="band">
      <p class="kicker">Sample reading</p>
      <h2>A calmer way to read the day</h2>
      <p>With the Moon emphasizing reflection while the Sun steadies your daily rhythm, today may feel less like a push forward and more like a careful recalibration. Notice where your chart asks for precision before momentum.</p>
      <p><a href="/register">Start your chart</a> <a href="/horoscope/aries/today">Explore today's sky</a></p>
    </section>
  </main>`;
}

function injectLandingIntoRoot() {
  const indexPath = join(distDir, 'index.html');
  const html = readFileSync(indexPath, 'utf8');
  if (!html.includes('<div id="app"></div>')) return;
  writeFileSync(indexPath, html.replace('<div id="app"></div>', `<div id="app">${landingStaticMarkup()}</div>`), 'utf8');
}

injectLandingIntoRoot();
writeOgImages();
for (const sign of zodiacSigns) {
  writeFileRoute(`/horoscope/${sign.slug}`, horoscopeHtml(sign));
  writeFileRoute(`/horoscope/${sign.slug}/today`, horoscopeHtml(sign, { today: true }));
}
for (const page of legalPages) writeFileRoute(`/${page.slug}`, legalHtml(page));
for (const a of zodiacSigns) {
  for (const b of zodiacSigns) writeFileRoute(`/compatibility/${a.slug}/${b.slug}`, compatibilityHtml(a, b));
}
writeSitemap();
writeRobots();
console.log(`Prerendered ${zodiacSigns.length * 2} horoscope pages, ${zodiacSigns.length * zodiacSigns.length} compatibility pages, ${legalPages.length} legal pages, sitemap.xml, robots.txt, and OG images`);
