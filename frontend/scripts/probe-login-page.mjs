import { chromium } from 'playwright';

const url = process.argv[2] ?? 'https://horoscope-frontend.pages.dev/login';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.on('console', (msg) => console.log(`[console ${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(5000);

const scriptSrc = await page.locator('script[type="module"]').first().getAttribute('src');
const authPageCount = await page.locator('.auth-page').count();
const authCardCount = await page.locator('.auth-card').count();
const emailCount = await page.locator('input[type="email"]').count();
const authPageVisible = authPageCount > 0 ? await page.locator('.auth-page').first().isVisible() : false;
const authPageBox = authPageCount > 0 ? await page.locator('.auth-page').first().boundingBox() : null;
const authCardBox = authCardCount > 0 ? await page.locator('.auth-card').first().boundingBox() : null;
const authPageStyles =
  authPageCount > 0
    ? await page.locator('.auth-page').first().evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          display: s.display,
          position: s.position,
          opacity: s.opacity,
          visibility: s.visibility,
          zIndex: s.zIndex,
          width: s.width,
          height: s.height,
          top: s.top,
        };
      })
    : null;
const mainHtml = await page.locator('main.page-content').innerHTML().catch(() => '(no main)');
const bodyChildCount = await page.evaluate(() => document.body.children.length);

console.log(JSON.stringify(
  {
    url,
    scriptSrc,
    authPageCount,
    authCardCount,
    emailCount,
    authPageVisible,
    authPageBox,
    authCardBox,
    authPageStyles,
    mainHtmlLength: mainHtml.length,
    mainHtmlPreview: mainHtml.slice(0, 400),
    bodyChildCount,
  },
  null,
  2,
));

await browser.close();
