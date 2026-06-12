import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distAssets = join(process.cwd(), 'dist', 'assets');
const files = readdirSync(distAssets).filter((f) => f.endsWith('.js'));
for (const file of files) {
  const js = readFileSync(join(distAssets, file), 'utf8');
  const jsMarkers = [
    'backend.ankhbayr2017.workers.dev',
    '/api/auth',
  ];
  console.log(file);
  for (const m of jsMarkers) {
    console.log(`  ${m}: ${js.includes(m)}`);
  }
}

// The `.auth-page` fixed-position fix lives in the global stylesheet chunk only.
// With code-split CSS the per-page chunks legitimately don't contain it, so the
// invariant is "present in at least one shipped CSS chunk", not "in every chunk".
let hasFixedAuthSomewhere = false;
const cssFiles = readdirSync(distAssets).filter((f) => f.endsWith('.css'));
for (const file of cssFiles) {
  const css = readFileSync(join(distAssets, file), 'utf8');
  const hasFixedAuth = /\.auth-page\{[^}]*position:\s*fixed/.test(css.replace(/\s+/g, ''));
  if (hasFixedAuth) {
    console.log(`${file}\n  auth-page position fixed: true`);
    hasFixedAuthSomewhere = true;
  }
}
if (!hasFixedAuthSomewhere) {
  console.error('Build verification failed: auth-page must use position:fixed');
  process.exit(1);
}
console.log('auth-page position:fixed present in shipped CSS ✓');
