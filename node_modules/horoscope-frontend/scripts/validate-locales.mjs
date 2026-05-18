import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createI18n } from 'vue-i18n';

const localesDir = join(process.cwd(), 'src', 'i18n', 'locales');
const files = readdirSync(localesDir).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const locale = file.replace('.json', '');
  const messages = JSON.parse(readFileSync(join(localesDir, file), 'utf8'));
  const i18n = createI18n({ legacy: false, locale, messages: { [locale]: messages } });
  const walk = (obj, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        try {
          i18n.global.t(path);
        } catch (err) {
          console.error(`${file} ${path}: ${err.message}`);
          process.exitCode = 1;
        }
      } else if (value && typeof value === 'object') {
        walk(value, path);
      }
    }
  };
  walk(messages);
  console.log(`OK ${file}`);
}
