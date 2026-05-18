/**
 * Direct-upload Pages projects need production_branch set before
 * horoscope-frontend.pages.dev serves assets (otherwise "Nothing is here yet").
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ACCOUNT_ID = 'b0664a04a184aa9c4da802f626b04cf3';
const PROJECT = 'horoscope-frontend';
const PRODUCTION_BRANCH = 'main';

function readWranglerOAuthToken() {
  const candidates = [
    join(process.env.APPDATA ?? '', 'xdg.config', '.wrangler', 'config', 'default.toml'),
    join(homedir(), '.wrangler', 'config', 'default.toml'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    const match = text.match(/^oauth_token\s*=\s*"([^"]+)"/m);
    if (match?.[1]) return match[1];
  }
  return null;
}

function resolveToken() {
  const fromEnv = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  return readWranglerOAuthToken();
}

async function main() {
  const token = resolveToken();
  if (!token) {
    console.error(
      'Missing API token. Run `npx wrangler login` or set CLOUDFLARE_API_TOKEN, then retry.',
    );
    process.exit(1);
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ production_branch: PRODUCTION_BRANCH }),
    },
  );

  const json = await res.json();
  if (!json.success) {
    console.error('Failed to set production_branch:', JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.log(`Set production_branch to "${PRODUCTION_BRANCH}" for ${PROJECT}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
