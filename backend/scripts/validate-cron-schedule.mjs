import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cronPath = resolve(root, 'src/cron.ts');
const jsoncConfigPath = resolve(root, 'wrangler.jsonc');
const tomlConfigPath = resolve(root, 'wrangler.toml');

function readExpectedCron() {
  const source = readFileSync(cronPath, 'utf8');
  const match = source.match(/CRON_DAILY\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(`Could not find CRON_DAILY in ${cronPath}`);
  }
  return match[1];
}

function readConfiguredCrons() {
  if (existsSync(tomlConfigPath)) {
    const source = readFileSync(tomlConfigPath, 'utf8');
    const match = source.match(/^\s*crons\s*=\s*\[([^\]]*)\]/m);
    if (!match) {
      throw new Error(`Could not find crons array in ${tomlConfigPath}`);
    }
    return Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g), (item) => item[1]);
  }

  const source = readFileSync(jsoncConfigPath, 'utf8');
  const match = source.match(/"crons"\s*:\s*\[([^\]]*)\]/);
  if (!match) {
    throw new Error(`Could not find triggers.crons array in ${jsoncConfigPath}`);
  }
  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}

const expected = readExpectedCron();
const configured = readConfiguredCrons();

if (configured.length !== 1 || configured[0] !== expected) {
  console.error('Cron schedule mismatch between Worker code and Wrangler config.', {
    expectedCronDaily: expected,
    configuredCrons: configured,
  });
  process.exit(1);
}

console.log('Cron schedule matches Worker CRON_DAILY.', { cron: expected });
