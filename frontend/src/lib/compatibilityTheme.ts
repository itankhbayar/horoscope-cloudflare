import type { CompatibilityShareLocale } from './compatibilityShareCard';

export type CompatibilityTheme = { title: string; summary: string };

export function compatibilityThemeFor(score: number, locale: CompatibilityShareLocale): CompatibilityTheme {
  if (score >= 85) {
    return locale === 'mn'
      ? {
          title: 'Соронзон зохицол',
          summary: 'Энэ холбоо амархан анхаарал татаж, нэг нэгнийхээ эрчийг өсгөх хандлагатай.',
        }
      : {
          title: 'Magnetic harmony',
          summary: 'This connection has an easy pull, with both signs likely to amplify each other.',
        };
  }
  if (score >= 70) {
    return locale === 'mn'
      ? {
          title: 'Дулаан хэмнэл',
          summary: 'Энд таталцал бий. Хамгийн сайн үедээ энэ хоёр бие биедээ хөдөлгөөн, итгэл өгнө.',
        }
      : {
          title: 'Warm momentum',
          summary: 'There is real pull here. At its best, this pairing gives each other movement and trust.',
        };
  }
  if (score >= 55) {
    return locale === 'mn'
      ? {
          title: 'Өөр хэмнэл, сонирхолтой таталцал',
          summary: 'Энэ холбоо яг адилхан биш учраас сонирхолтой. Ойлголцол нь анхаарал шаарддаг.',
        }
      : {
          title: 'Different rhythms, real curiosity',
          summary: 'This pairing is interesting because it is not automatic. The spark grows when both people stay curious.',
        };
  }
  return locale === 'mn'
    ? {
        title: 'Өсөлтийн ирмэг',
        summary: 'Энэ холбоо ажиллахын тулд илүү тод харилцаа, зөөлөн хил хэрэгтэй.',
      }
    : {
        title: 'Growth edge',
        summary: 'This connection needs clearer language and gentler boundaries to feel easy.',
      };
}

export function compatibilityShareLocale(locale?: string): CompatibilityShareLocale {
  return locale?.startsWith('mn') ? 'mn' : 'en';
}
