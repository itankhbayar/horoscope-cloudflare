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

let ok = true;
const cssFiles = readdirSync(distAssets).filter((f) => f.endsWith('.css'));
for (const file of cssFiles) {
  const css = readFileSync(join(distAssets, file), 'utf8');
  const hasFixedAuth = /\.auth-page\{[^}]*position:\s*fixed/.test(css.replace(/\s+/g, ''));
  console.log(file);
  console.log(`  auth-page position fixed: ${hasFixedAuth}`);
  if (!hasFixedAuth) ok = false;
}
if (!ok) {
  console.error('Build verification failed: auth-page must use position:fixed');
  process.exit(1);
}
