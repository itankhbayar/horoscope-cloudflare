import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cronPath = resolve(root, 'src/cron.ts');
const jsoncConfigPath = resolve(root, 'wrangler.jsonc');
const tomlConfigPath = resolve(root, 'wrangler.toml');

function readExpectedCrons() {
  const source = readFileSync(cronPath, 'utf8');
  const daily = source.match(/CRON_DAILY\s*=\s*['"]([^'"]+)['"]/);
  if (!daily) {
    throw new Error(`Could not find CRON_DAILY in ${cronPath}`);
  }
  const hourly = source.match(/CRON_HOURLY\s*=\s*['"]([^'"]+)['"]/);
  if (!hourly) {
    throw new Error(`Could not find CRON_HOURLY in ${cronPath}`);
  }
  return [daily[1], hourly[1]];
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

const expected = readExpectedCrons();
const configured = readConfiguredCrons();

const sameSet =
  configured.length === expected.length &&
  [...expected].sort().every((cron, idx) => cron === [...configured].sort()[idx]);

if (!sameSet) {
  console.error('Cron schedule mismatch between Worker code and Wrangler config.', {
    expectedCrons: expected,
    configuredCrons: configured,
  });
  process.exit(1);
}

console.log('Cron schedule matches Worker CRON_DAILY and CRON_HOURLY.', { crons: expected });
