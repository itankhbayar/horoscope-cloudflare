import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const siteUrl = (
  process.env.VITE_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  'https://horoscope-frontend.pages.dev'
).replace(/\/$/, '');

const zodiacSigns = [
  {
    slug: 'aries',
    name: 'Aries',
    dates: 'Mar 21 - Apr 19',
    element: 'Fire',
    symbol: 'ARI',
    intro:
      'Aries moves first, trusts momentum, and turns instinct into action. Today is about choosing the bold step without burning through your energy.',
    preview:
      'Your daily preview points toward decisive conversations, brave prioritization, and a cleaner boundary around distractions.',
  },
  {
    slug: 'taurus',
    name: 'Taurus',
    dates: 'Apr 20 - May 20',
    element: 'Earth',
    symbol: 'TAU',
    intro:
      'Taurus builds slowly, beautifully, and with staying power. Today asks you to protect what is valuable while making room for one useful change.',
    preview:
      'Your daily preview highlights money, comfort, loyalty, and the small routines that make your nervous system feel safe.',
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    dates: 'May 21 - Jun 20',
    element: 'Air',
    symbol: 'GEM',
    intro:
      'Gemini thrives on pattern, wit, and discovery. Today favors the message you send, the question you ask, and the idea you finally name.',
    preview:
      'Your daily preview brings focus to conversations, choices, and the signal hidden inside too much information.',
  },
  {
    slug: 'cancer',
    name: 'Cancer',
    dates: 'Jun 21 - Jul 22',
    element: 'Water',
    symbol: 'CAN',
    intro:
      'Cancer reads the emotional weather before anyone says a word. Today invites you to care deeply without carrying what is not yours.',
    preview:
      'Your daily preview centers home, belonging, intuition, and the kind of softness that still has a spine.',
  },
  {
    slug: 'leo',
    name: 'Leo',
    dates: 'Jul 23 - Aug 22',
    element: 'Fire',
    symbol: 'LEO',
    intro:
      'Leo brings warmth, courage, and creative gravity. Today is about being seen for the right reasons and choosing expression over performance.',
    preview:
      'Your daily preview spotlights confidence, romance, creativity, and the moment where generosity becomes leadership.',
  },
  {
    slug: 'virgo',
    name: 'Virgo',
    dates: 'Aug 23 - Sep 22',
    element: 'Earth',
    symbol: 'VIR',
    intro:
      'Virgo notices the detail that changes the whole system. Today rewards practical edits, cleaner rhythms, and a kinder standard for yourself.',
    preview:
      'Your daily preview focuses on work, wellness, organization, and the one improvement that makes everything easier.',
  },
  {
    slug: 'libra',
    name: 'Libra',
    dates: 'Sep 23 - Oct 22',
    element: 'Air',
    symbol: 'LIB',
    intro:
      'Libra seeks harmony that is honest, not decorative. Today asks for a graceful choice that keeps beauty and truth in the same room.',
    preview:
      'Your daily preview emphasizes partnership, aesthetics, diplomacy, and the balance between pleasing others and honoring yourself.',
  },
  {
    slug: 'scorpio',
    name: 'Scorpio',
    dates: 'Oct 23 - Nov 21',
    element: 'Water',
    symbol: 'SCO',
    intro:
      'Scorpio sees beneath the surface and knows when something is ready to transform. Today favors depth, privacy, and emotional precision.',
    preview:
      'Your daily preview points to trust, intimacy, release, and the power that returns when you stop negotiating with what is done.',
  },
  {
    slug: 'sagittarius',
    name: 'Sagittarius',
    dates: 'Nov 22 - Dec 21',
    element: 'Fire',
    symbol: 'SAG',
    intro:
      'Sagittarius needs meaning, movement, and a horizon. Today invites a larger perspective without skipping the practical next step.',
    preview:
      'Your daily preview highlights travel, learning, optimism, and the truth that wants to become a plan.',
  },
  {
    slug: 'capricorn',
    name: 'Capricorn',
    dates: 'Dec 22 - Jan 19',
    element: 'Earth',
    symbol: 'CAP',
    intro:
      'Capricorn understands time, effort, and earned confidence. Today supports structure, ambition, and progress you can actually measure.',
    preview:
      'Your daily preview focuses on career, responsibility, long-term plans, and the boundary that protects your climb.',
  },
  {
    slug: 'aquarius',
    name: 'Aquarius',
    dates: 'Jan 20 - Feb 18',
    element: 'Air',
    symbol: 'AQU',
    intro:
      'Aquarius brings future-facing clarity and refuses stale patterns. Today encourages experimentation that still respects your real life.',
    preview:
      'Your daily preview spotlights friendship, innovation, independence, and the idea that becomes useful when shared.',
  },
  {
    slug: 'pisces',
    name: 'Pisces',
    dates: 'Feb 19 - Mar 20',
    element: 'Water',
    symbol: 'PIS',
    intro:
      'Pisces feels the invisible thread between dream, memory, and meaning. Today asks you to trust intuition while giving it a gentle container.',
    preview:
      'Your daily preview centers rest, creativity, compassion, and the quiet sign that tells you what your spirit already knows.',
  },
];

const faqs = [
  {
    question: 'Is this horoscope updated daily?',
    answer:
      'This public page gives an evergreen daily preview. Sign in to Astralis for personalized daily guidance based on your profile and chart.',
  },
  {
    question: 'Can I get a more personal horoscope?',
    answer:
      'Yes. Astralis combines your birth data, zodiac placements, and premium features to create more tailored daily guidance.',
  },
  {
    question: 'What does Premium unlock?',
    answer:
      'Premium unlocks deeper daily guidance, unlimited tarot, advanced compatibility, full birth chart access, and an ad-free experience.',
  },
];

const legalPages = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description:
      'Privacy Policy for Astralis covering account data, horoscope preferences, billing, notifications, analytics, and deletion.',
    body: [
      ['Account and profile data', 'We collect account details such as name, email, password hash, avatar, display name, bio, timezone, and app settings. Raw passwords are never stored.'],
      ['Horoscope data', 'Birth date, optional birth time, birth city, country, coordinates, timezone offset, zodiac placements, natal chart data, compatibility results, tarot preferences, and cached personalized content may be stored to provide readings.'],
      ['Billing', 'Stripe or app store billing handles payment details. Astralis stores billing identifiers such as customer and subscription IDs to activate Premium and support billing workflows.'],
      ['Notifications', 'If enabled, notification preferences and Expo push tokens are stored so notifications can be delivered or disabled.'],
      ['Analytics and crashes', 'The current app does not include a dedicated third-party analytics or crash reporting SDK. This policy will be updated if that changes.'],
      ['Contact', 'Privacy requests can be sent to ankhbayr2017@gmail.com.'],
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    description:
      'Astralis Terms of Service covering subscriptions, auto-renewal, refunds, acceptable use, and liability limits.',
    body: [
      ['Subscriptions', 'Premium may be offered as monthly or yearly subscriptions. Pricing, billing period, and trial eligibility are shown before purchase.'],
      ['Auto-renewal', 'Subscriptions renew automatically unless canceled before the end of the current billing period through Apple, Google, or Stripe billing settings as applicable.'],
      ['Refunds', 'Payments are generally non-refundable except where required by law or the applicable app store policy.'],
      ['Acceptable use', 'Do not misuse the service, access another account, interfere with payments, spam the app, or use Astralis for unlawful or abusive activity.'],
      ['Limitation of liability', 'Astralis is provided as is. Horoscope content is for reflection and entertainment, not medical, legal, financial, or professional advice.'],
    ],
  },
  {
    slug: 'delete-account',
    title: 'Delete Your Account',
    description:
      'How to delete your Astralis account and remove profile, horoscope, chart, notification, and personalized cached data.',
    body: [
      ['Delete from the app', 'Sign in, open Profile, choose Delete Account, review the warning, and confirm deletion.'],
      ['What is removed', 'Deletion removes or anonymizes account credentials, profile records, birth profile data, natal chart data, push notification tokens, notification preferences, and personalized cached content tied to your account.'],
      ['Subscriptions', 'Deleting your account may not cancel Apple App Store or Google Play subscriptions. Manage mobile subscriptions in Apple or Google billing settings.'],
      ['Support', 'If you cannot access your account, contact ankhbayr2017@gmail.com from the email address associated with your account.'],
    ],
  },
];

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

function pageHtml(sign) {
  const title = `${sign.name} Horoscope Today`;
  const description = `Read today's ${sign.name} horoscope preview, zodiac traits, daily guidance themes, FAQs, and links to every sign from Astralis.`;
  const canonical = `${siteUrl}/horoscope/${sign.slug}`;
  const otherSigns = zodiacSigns.filter((item) => item.slug !== sign.slug);
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonical,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Astralis',
        url: siteUrl,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ];

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="icon" href="/favicon.ico">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">${jsonLd(structuredData)}</script>
    <style>
      :root{color-scheme:dark;--bg:#050510;--surface:#101125;--card:#161832;--text:#f3f0ff;--muted:#b8bde2;--gold:#d4af37;--accent:#8b6bff;--border:rgba(212,175,55,.24)}
      *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 75% 0%,rgba(139,107,255,.28),transparent 32%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}
      a{color:inherit}.page{max-width:1040px;margin:0 auto;padding:28px 18px 44px}.hero{min-height:78vh;display:grid;align-content:center;gap:22px;border-bottom:1px solid rgba(255,255,255,.08)}
      .eyebrow,.pill{color:var(--gold);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.78rem}.hero-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);gap:34px;align-items:center}
      h1{font-size:clamp(2.6rem,7vw,5.4rem);line-height:.96;margin:0;letter-spacing:0}.subtitle{font-size:clamp(1.05rem,2vw,1.28rem);color:var(--muted);max-width:680px;margin:0}
      .visual{position:relative;min-height:360px;border:1px solid var(--border);border-radius:24px;background:linear-gradient(145deg,rgba(212,175,55,.16),rgba(139,107,255,.18) 42%,rgba(16,17,37,.92));overflow:hidden;padding:24px}
      .symbol{position:absolute;right:18px;top:0;font-size:10rem;color:rgba(255,255,255,.13)}.wheel{position:absolute;inset:40px;border:1px solid rgba(212,175,55,.32);border-radius:50%}.wheel:before,.wheel:after{content:"";position:absolute;inset:38px;border:1px solid rgba(255,255,255,.14);border-radius:50%}.wheel:after{inset:86px;background:rgba(212,175,55,.18)}
      .visual-copy{position:absolute;left:24px;right:24px;bottom:24px}.visual-copy strong{display:block;font-size:1.2rem}.visual-copy span{color:var(--muted)}
      .cta-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:999px;background:var(--gold);color:#17101f;text-decoration:none;font-weight:900}.button.secondary{background:rgba(255,255,255,.08);color:var(--text);border:1px solid rgba(255,255,255,.16)}
      section{padding:34px 0}.section-title{font-size:clamp(1.75rem,4vw,2.7rem);line-height:1.08;margin:0 0 14px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{border:1px solid rgba(255,255,255,.1);background:rgba(16,17,37,.78);border-radius:18px;padding:18px}.card h3{margin:0 0 8px;font-size:1.08rem}.card p,.faq p{margin:0;color:var(--muted)}
      .preview{border:1px solid var(--border);border-radius:22px;padding:22px;background:linear-gradient(140deg,rgba(139,107,255,.18),rgba(212,175,55,.1));}.preview p{color:var(--muted)}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{border:1px solid rgba(255,255,255,.13);border-radius:999px;padding:8px 12px;text-decoration:none;color:var(--muted)}.links a:hover{color:var(--text);border-color:var(--gold)}
      .faq{display:grid;gap:12px}.faq article{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px;background:rgba(255,255,255,.04)}.faq h3{margin:0 0 6px}
      footer{padding-top:18px;border-top:1px solid rgba(255,255,255,.09);color:var(--muted);font-size:.9rem}
      @media (max-width:760px){.hero{min-height:auto;padding:34px 0}.hero-grid,.grid{grid-template-columns:1fr}.visual{min-height:280px}h1{font-size:3.15rem}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-grid">
          <div>
            <p class="eyebrow">${escapeHtml(sign.dates)} &middot; ${escapeHtml(sign.element)} sign</p>
            <h1>${escapeHtml(title)}</h1>
            <p class="subtitle">${escapeHtml(sign.intro)}</p>
            <div class="cta-row">
              <a class="button" href="/register">Create your free chart</a>
              <a class="button secondary" href="/premium">Unlock Premium guidance</a>
            </div>
          </div>
          <aside class="visual" aria-label="${escapeHtml(sign.name)} zodiac visual">
            <div class="symbol" aria-hidden="true">${sign.symbol}</div>
            <div class="wheel" aria-hidden="true"></div>
            <div class="visual-copy">
              <span>${escapeHtml(sign.name)} energy</span>
              <strong>Daily timing, tarot, chart insight, and relationship clarity.</strong>
            </div>
          </aside>
        </div>
      </section>

      <section class="preview" aria-labelledby="daily-preview">
        <p class="pill">Daily horoscope preview</p>
        <h2 id="daily-preview" class="section-title">What today asks of ${escapeHtml(sign.name)}</h2>
        <p>${escapeHtml(sign.preview)}</p>
        <p>For a more personal reading, sign in to Astralis and unlock guidance shaped by your profile, birth chart, tarot, and compatibility patterns.</p>
      </section>

      <section aria-labelledby="premium-value">
        <h2 id="premium-value" class="section-title">Go deeper than a generic horoscope</h2>
        <div class="grid">
          <article class="card"><h3>Personalized daily guidance</h3><p>Turn zodiac themes into practical timing for focus, love, energy, and decisions.</p></article>
          <article class="card"><h3>Unlimited tarot</h3><p>Pull full readings when the day changes and revisit insight without waiting.</p></article>
          <article class="card"><h3>Advanced compatibility</h3><p>Understand the emotional rhythm between two people, not just a sign match.</p></article>
        </div>
      </section>

      <section aria-labelledby="all-signs">
        <h2 id="all-signs" class="section-title">Explore other zodiac horoscopes</h2>
        <nav class="links" aria-label="Zodiac horoscope pages">
          ${otherSigns.map((item) => `<a href="/horoscope/${item.slug}">${escapeHtml(item.name)}</a>`).join('\n          ')}
        </nav>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" class="section-title">${escapeHtml(sign.name)} horoscope FAQ</h2>
        <div class="faq">
          ${faqs
            .map(
              (faq) => `<article><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></article>`,
            )
            .join('\n          ')}
        </div>
      </section>

      <footer>
        <p>Astralis offers public zodiac pages for discovery and private authenticated tools for chart-based guidance. <a href="/login">Sign in</a> or <a href="/register">create an account</a>.</p>
      </footer>
    </main>
  </body>
</html>`;
}

function legalPageHtml(page) {
  const canonical = `${siteUrl}/${page.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Astralis',
      url: siteUrl,
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(page.title)} | Astralis</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="icon" href="/favicon.ico">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(page.title)} | Astralis">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <script type="application/ld+json">${jsonLd(structuredData)}</script>
    <style>
      :root{color-scheme:dark;--bg:#050510;--surface:#101125;--text:#f3f0ff;--muted:#b8bde2;--gold:#d4af37;--border:rgba(212,175,55,.24)}
      *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0%,rgba(139,107,255,.22),transparent 34%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6}
      main{width:min(920px,100%);margin:0 auto;padding:42px 18px 56px}.card{border:1px solid var(--border);background:rgba(16,17,37,.82);border-radius:22px;padding:clamp(22px,5vw,42px)}
      a{color:var(--gold)}.kicker{color:var(--gold);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.78rem}h1{font-size:clamp(2.4rem,8vw,4.6rem);line-height:1;margin:.2rem 0 1rem}h2{font-size:clamp(1.25rem,4vw,1.75rem);margin:0 0 .4rem}p{color:var(--muted);max-width:72ch}section{padding:18px 0;border-top:1px solid rgba(255,255,255,.08)}nav{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}nav a{border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:9px 13px;text-decoration:none;color:var(--muted)}
    </style>
  </head>
  <body>
    <main>
      <article class="card">
        <p class="kicker">Astralis</p>
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.description)}</p>
        ${page.body
          .map(
            ([heading, copy]) =>
              `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(copy)}</p></section>`,
          )
          .join('\n        ')}
        <nav aria-label="Legal pages">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/delete-account">Delete Account</a>
          <a href="/register">Create account</a>
        </nav>
      </article>
    </main>
  </body>
</html>`;
}

function writeZodiacPages() {
  for (const sign of zodiacSigns) {
    const routeDir = join(distDir, 'horoscope', sign.slug);
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(join(routeDir, 'index.html'), pageHtml(sign), 'utf8');
  }
}

function writeLegalPages() {
  for (const page of legalPages) {
    const routeDir = join(distDir, page.slug);
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(join(routeDir, 'index.html'), legalPageHtml(page), 'utf8');
  }
}

function writeSitemap() {
  const indexRoutes = ['', '/login', '/register', '/premium'];
  const staticRoutes = [
    ...indexRoutes,
    ...legalPages.map((page) => `/${page.slug}`),
    ...zodiacSigns.map((sign) => `/horoscope/${sign.slug}`),
  ];
  const today = new Date().toISOString().slice(0, 10);
  const urls = staticRoutes
    .map(
      (route) => `  <url>
    <loc>${siteUrl}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.startsWith('/horoscope/') ? 'daily' : 'weekly'}</changefreq>
    <priority>${route.startsWith('/horoscope/') ? '0.8' : route === '' ? '0.7' : '0.5'}</priority>
  </url>`,
    )
    .join('\n');

  writeFileSync(
    join(distDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    'utf8',
  );
}

function writeRobots() {
  writeFileSync(
    join(distDir, 'robots.txt'),
    `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`,
    'utf8',
  );
}

readFileSync(join(distDir, 'index.html'), 'utf8');
writeZodiacPages();
writeLegalPages();
writeSitemap();
writeRobots();
console.log(
  `Prerendered ${zodiacSigns.length} zodiac pages, ${legalPages.length} legal pages, sitemap.xml, and robots.txt`,
);
