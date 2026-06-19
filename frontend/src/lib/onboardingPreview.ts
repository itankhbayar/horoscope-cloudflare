import { getZodiacInfo } from './zodiac';
import type { AtmosphereKey, PersonalSkyLayer } from './types';

type PreviewLocale = 'en' | 'mn';

export type OnboardingPreviewModel = {
  signName: string;
  element: string;
  modality: string;
  identityTitle: string;
  identityBody: string;
  todayTheme: string;
  transitTitle: string;
  transitBody: string;
  missingTitle: string;
  missingItems: string[];
  missingBody: string;
  futureTitle: string;
  futureBody: string;
  saveTitle: string;
  saveBody: string;
};

const ELEMENT_COPY: Record<PreviewLocale, Record<string, string>> = {
  en: {
    fire: 'direct, energetic, and action-oriented',
    earth: 'steady, practical, and drawn to what can be trusted',
    air: 'curious, connective, and quick to notice patterns',
    water: 'intuitive, feeling-led, and sensitive to atmosphere',
  },
  mn: {
    fire: 'шууд, эрчтэй, үйлдэл рүү тэмүүлдэг',
    earth: 'тогтвортой, бодитой, итгэж болох зүйлд ойр',
    air: 'сониуч, холбож хардаг, хэв маягийг хурдан анзаардаг',
    water: 'зөнтэй, мэдрэмжээрээ чиглэдэг, уур амьсгалд мэдрэмтгий',
  },
};

const MODALITY_COPY: Record<PreviewLocale, Record<string, string>> = {
  en: {
    cardinal: 'You tend to initiate movement when something matters.',
    fixed: 'You tend to stay with what matters until it becomes real.',
    mutable: 'You tend to adapt quickly and read shifts in the room.',
  },
  mn: {
    cardinal: 'Танд чухал санагдсан зүйлд эхлэл тавих хандлага бий.',
    fixed: 'Танд чухал зүйлээ бодит болтол нь барьж явах хандлага бий.',
    mutable: 'Та өөрчлөлтийг хурдан мэдэрч, нөхцөлдөө дасан зохицох хандлагатай.',
  },
};

const THEME_LABELS: Record<PreviewLocale, Record<AtmosphereKey, string>> = {
  en: {
    tension: 'honest tension',
    intimacy: 'emotional closeness',
    clarity: 'clearer language',
    momentum: 'forward movement',
    uncertainty: 'careful uncertainty',
    reflection: 'quiet reflection',
    socialOpenness: 'social openness',
    emotionalVolatility: 'emotional weather',
  },
  mn: {
    tension: 'үнэнч хурцадмал байдал',
    intimacy: 'сэтгэлийн ойр байдал',
    clarity: 'илүү тод хэл',
    momentum: 'урагшлах хөдөлгөөн',
    uncertainty: 'болгоомжтой тодорхойгүй байдал',
    reflection: 'нам тусгал',
    socialOpenness: 'харилцааны нээлттэй байдал',
    emotionalVolatility: 'сэтгэлийн хувьсамтгай уур амьсгал',
  },
};

export function buildOnboardingPreview(
  layer: PersonalSkyLayer,
  input: { hasBirthTime: boolean; cityName?: string | null; locale?: string },
): OnboardingPreviewModel {
  const locale = input.locale?.startsWith('mn') ? 'mn' : 'en';
  const sign = getZodiacInfo(layer.sign);
  const dominant = dominantAtmosphere(layer.sky.atmosphere);
  const aspect = layer.sky.majorAspects[0];
  const city = input.cityName?.trim();

  return {
    signName: sign.name,
    element: titleCase(sign.element),
    modality: titleCase(sign.modality),
    identityTitle: locale === 'mn' ? `Таны Нар ${sign.name} ордод байна.` : `Your Sun is in ${sign.name}.`,
    identityBody:
      locale === 'mn'
        ? `${sign.name} нь ${ELEMENT_COPY.mn[sign.element]}. ${MODALITY_COPY.mn[sign.modality]}`
        : `${sign.name} is ${ELEMENT_COPY.en[sign.element]}. ${MODALITY_COPY.en[sign.modality]}`,
    todayTheme:
      locale === 'mn'
        ? `Өнөөдрийн давамгай өнгө: ${THEME_LABELS.mn[dominant]}.`
        : `Today's dominant theme: ${THEME_LABELS.en[dominant]}.`,
    transitTitle: aspect
      ? `${aspect.body1} ${aspect.type} ${aspect.body2}`
      : locale === 'mn'
        ? `${sign.name} ба өнөөдрийн тэнгэр`
        : `${sign.name} and today's sky`,
    transitBody:
      locale === 'mn'
        ? `${layer.howTonightAffectsYou}${city ? ` ${city} таны төрсөн тэнгэрийн байршлыг газартай холбож өгдөг.` : ''}`
        : `${layer.howTonightAffectsYou}${city ? ` ${city} anchors the sky to your birthplace.` : ''}`,
    missingTitle: input.hasBirthTime
      ? locale === 'mn'
        ? 'Төрсөн цаг нэмэгдсэн.'
        : 'Birth time added.'
      : locale === 'mn'
        ? 'Төрсөн цаг нэмбэл дараагийн давхарга нээгдэнэ.'
        : 'Add your birth time to unlock the next layer.',
    missingItems: input.hasBirthTime
      ? locale === 'mn'
        ? ['Мандах орд', 'Гэрийн байрлал', 'Илүү нарийн цаглал']
        : ['Rising sign', 'House placements', 'More precise timing']
      : locale === 'mn'
        ? ['Мандах орд', 'Гэрийн байрлал', 'Илүү нарийн цаглал']
        : ['Rising sign', 'House placements', 'More precise timing'],
    missingBody: input.hasBirthTime
      ? locale === 'mn'
        ? 'Энэ нь дараа бүртгэлтэй зураг дээр илүү нарийн уншлага хадгалахад тусална.'
        : 'This helps saved readings become more precise once your account is created.'
      : locale === 'mn'
        ? 'Энэ бол шийтгэл биш. Одоогийн уншлага ажиллана, харин цагтай хэсэг дараа илүү тодорно.'
        : 'No penalty. This preview still works, and the timing-specific details can become clearer later.',
    futureTitle: locale === 'mn' ? 'Таны хувийн тэнгэрийн түүх өнөөдрөөс эхэлнэ.' : 'Your personal sky history begins today.',
    futureBody:
      locale === 'mn'
        ? 'Цаг хугацааны явцад Astralis таны уншлагад давтагдаж буй сэдвүүдийг харуулах боломжтой.'
        : 'Over time, Astralis can reveal recurring themes in your readings.',
    saveTitle:
      locale === 'mn'
        ? 'Өнөөдрийн уншлагаа хадгалахын тулд бүртгэл үүсгээрэй.'
        : "Create an account to save today's reading.",
    saveBody:
      locale === 'mn'
        ? 'Уншлагаа хадгалаад хувийн тэнгэрийн түүхээ аажмаар бүтээ.'
        : 'Save this preview and start building your personal sky history.',
  };
}

function dominantAtmosphere(atmosphere: PersonalSkyLayer['sky']['atmosphere']): AtmosphereKey {
  return Object.entries(atmosphere).sort((a, b) => b[1] - a[1])[0]?.[0] as AtmosphereKey;
}

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
