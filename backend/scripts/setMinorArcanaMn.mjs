// Refined Mongolian descriptions for Minor Arcana cards in tarot_cards.json.
// Only `description.mn` is overwritten; `description.en` (verbatim Waite) is left intact.
// Keyed by English card name. Run: node scripts/setMinorArcanaMn.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const p = join(__dirname, '..', 'data', 'tarot_cards.json');

const MN = {
  'Page of Cups': 'Ном сурах эрмэлзэлтэй, анхаарлаа бүрэн төвлөрүүлсэн төрхтэй, царайлаг, тааламжтай, бага зэрэг эмэгтэйлэг шинжтэй нэгэн залуу (хуудас / элч) хундаган дотроос өөр рүү нь харахаар цухуйн гарч буй загасыг ширтэн байна. Энэ бол оюун санаанд орших дүрслэлүүд бодит хэлбэр дүрсээ олж буйг харуулсан зураглал юм.',
  'Knight of Cups': 'Сүр жавхлантай боловч дайчин шинжгүй; далавчит дуулга өмсөн тайван давхиж явах бөгөөд энэ нь заримдаа уг хөзрийг тодорхойлдог ургуулан бодох чадварын (төсөөллийн) илүү дээд, гоо үзэсгэлэнт чанарыг илэрхийлдэг. Тэрээр мөн л нэгэн мөрөөдөгч бөгөөд мэдрэхүйн ертөнцийн элдэв дүрслэлүүд түүний үзэгдэл дунд үргэлж үзэгдэн харагддаг байна.',
};

const data = JSON.parse(readFileSync(p, 'utf8'));
let updated = 0;
const missing = [];
for (const [name, mn] of Object.entries(MN)) {
  const card = data.find((c) => c.name.en === name && c.arcana === 'Minor');
  if (!card) { missing.push(name); continue; }
  card.description = { en: card.description.en.trim(), mn: mn.trim() };
  updated += 1;
}
writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Updated ${updated} minor arcana MN descriptions. Missing: ${missing.length ? missing.join(', ') : 'none'}`);
