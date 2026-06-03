import type { ZodiacSign } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';

/**
 * Deterministic onboarding "aha moment" content.
 *
 * Goal: within the first seconds, the user should feel "this app understands me".
 * Generation is fully deterministic — no AI, no randomness, no network. The variant a
 * user sees is chosen from a stable hash of their existing astrology profile (sun + moon
 * + rising), so it feels personal and is stable across launches, yet two people who share
 * a sun sign but differ in moon/rising can land on different variants.
 *
 * Tone rules (enforced by review + tests):
 *  - Warm, emotionally intelligent, slightly uncanny.
 *  - Never negative, alarming, medical, or mental-health related.
 *  - Localized; Mongolian (`mn`) is the primary audience, English (`en`) is the fallback.
 */

export type HookLang = 'mn' | 'en';
export type HookElement = 'fire' | 'earth' | 'air' | 'water';

export interface HookVariant {
  /** The bold, flattering observation. */
  title: string;
  /** The warm, slightly uncanny turn that makes it feel personal. */
  body: string;
}

export interface OnboardingHook extends HookVariant {
  sign: ZodiacSign;
  element: HookElement;
  /** Index of the chosen variant — surfaced to analytics for content tuning. */
  variant: number;
}

export const ELEMENT_LABEL: Record<HookLang, Record<HookElement, string>> = {
  mn: { fire: 'Гал', earth: 'Шороо', air: 'Агаар', water: 'Ус' },
  en: { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water' },
};

// Each sign carries multiple variants per language. Variants follow the same shape as the
// brief's examples: a strong outward read, then a tender inner truth.
const HOOKS: Record<ZodiacSign, Record<HookLang, HookVariant[]>> = {
  aries: {
    mn: [
      { title: 'Чи эхэлж алхдаг хүн.', body: 'Гэхдээ зоригтой дүрийнхээ цаана хэнд ч хэлдэггүй зөөлөн тал чинь бий.' },
      { title: 'Чи хурдан шийддэг.', body: 'Гэхдээ хамгийн чухал шийдвэрүүдээ дотроо удаан тээж яваад л гаргадаг.' },
      { title: 'Чи хүчтэй харагддаг.', body: 'Гэхдээ заримдаа эхэлж алхах гэдэг өөрөө л хамгийн их зориг шаарддагийг чи мэднэ.' },
    ],
    en: [
      { title: 'You are the one who moves first.', body: 'But behind that bold front is a softness you rarely let anyone see.' },
      { title: 'You decide quickly.', body: 'Yet the choices that matter most, you carry quietly for a long time before you act.' },
      { title: 'You look fearless.', body: 'But you know that being the first to move is often the bravest thing in the room.' },
    ],
  },
  taurus: {
    mn: [
      { title: 'Чамд итгэхэд хугацаа хэрэгтэй.', body: 'Гэхдээ нэгэнт итгэвэл маш үнэнч байдаг.' },
      { title: 'Чи тайван байдлыг эрхэмлэдэг.', body: 'Гэхдээ тэр тайван байдал чинь сул дорой биш, харин гүн тогтвортой байдлаас ирдэг.' },
      { title: 'Чи яаравчлахгүй.', body: 'Гэхдээ нэгэнт сонгосон зүйлдээ хэн ч хүрэхгүй гүнзгий зүтгэдэг.' },
    ],
    en: [
      { title: 'You take time to trust.', body: 'But once you do, your loyalty runs deeper than most people ever notice.' },
      { title: 'You value calm.', body: 'And that calm is not avoidance — it comes from a steadiness others quietly lean on.' },
      { title: 'You refuse to be rushed.', body: 'Yet what you do choose, you commit to with a depth few can match.' },
    ],
  },
  gemini: {
    mn: [
      { title: 'Чамд олон тал бий.', body: 'Гэхдээ үнэндээ чи бүх талаараа ойлгогдохыг л хүсдэг.' },
      { title: 'Чиний бодол хэзээ ч амрахгүй.', body: 'Гэхдээ тэр тасралтгүй сониуч зан чинь чамайг хаана ч уйдгахгүй.' },
      { title: 'Чи амархан ярьдаг.', body: 'Гэхдээ хамгийн чухал бодлоо зөв хүнд хэлэх мөчийг чимээгүйхэн хүлээдэг.' },
    ],
    en: [
      { title: 'You carry many sides.', body: 'But what you really want is to be understood in all of them at once.' },
      { title: 'Your mind never quite rests.', body: 'And that restless curiosity is exactly why you are never truly bored.' },
      { title: 'You speak easily.', body: 'Yet your most important thoughts wait quietly for the right person to hear them.' },
    ],
  },
  cancer: {
    mn: [
      { title: 'Чи бусдыг хамгаалдаг.', body: 'Гэхдээ өөрийгөө хэн хамгаалж байгааг ховорхон асуудаг.' },
      { title: 'Чи бүх зүйлийг гүнээ мэдэрдэг.', body: 'Гэхдээ тэр мэдрэмж чинь сул тал биш, харин чиний хамгийн том хүч юм.' },
      { title: 'Чи харуулснаасаа илүүг өгдөг.', body: 'Гэхдээ хайр чинь чимээгүй хэдий ч хүмүүс түүнийг санаж явдаг.' },
    ],
    en: [
      { title: 'You protect the people you love.', body: 'But you rarely stop to ask who is protecting you.' },
      { title: 'You feel everything deeply.', body: 'And that depth is not a weakness — it is quietly your greatest strength.' },
      { title: 'You give more than you show.', body: 'Your care is quiet, yet it is the thing people remember most about you.' },
    ],
  },
  leo: {
    mn: [
      { title: 'Чи өрөөг гэрэлтүүлдэг.', body: 'Гэхдээ тэр гэрлийн цаана хэнд ч үзүүлдэггүй ачааг чимээгүй үүрдэг.' },
      { title: 'Чи анзаарагдахыг хүсдэг.', body: 'Гэхдээ үнэндээ чи зүгээр л чин сэтгэлээсээ үнэлэгдэхийг хүсдэг.' },
      { title: 'Чи бахдам зоригтой.', body: 'Гэхдээ хамгийн дотно хүмүүсийнхээ өмнө л жинхэнэ зөөлөн чанараа нээдэг.' },
    ],
    en: [
      { title: 'You light up the room.', body: 'But behind that warmth you quietly carry a weight you let no one see.' },
      { title: 'You want to be seen.', body: 'And what you truly long for is to be appreciated, honestly and fully.' },
      { title: 'You carry an admirable courage.', body: 'Yet your real tenderness only opens for the few people closest to you.' },
    ],
  },
  virgo: {
    mn: [
      { title: 'Чи бүх жижиг зүйлийг анзаардаг.', body: 'Гэхдээ хамгийн хатуу шаардлагаа эхлээд өөртөө тавьдаг.' },
      { title: 'Чи бусдад анзаарагддаггүйгээр санаа тавьдаг.', body: 'Гэхдээ тэр чимээгүй халамж чинь хүмүүсийн амьдралыг үнэхээр өөрчилдөг.' },
      { title: 'Чи төгс байхыг хичээдэг.', body: 'Гэхдээ чи аль хэдийн хангалттай гэдгээ заримдаа мартдаг.' },
    ],
    en: [
      { title: 'You notice every small thing.', body: 'But the highest standard you hold is the one you place on yourself.' },
      { title: 'You care in ways no one sees.', body: 'And that quiet attention genuinely changes the lives around you.' },
      { title: 'You strive to get it right.', body: 'Yet you sometimes forget that you are already more than enough.' },
    ],
  },
  libra: {
    mn: [
      { title: 'Чи зохицлыг эрэлхийлдэг.', body: 'Гэхдээ бусдын тэнцвэрийг хадгалахын тулд өөрийнхөө хэрэгцээг чимээгүй нааш тавьдаг.' },
      { title: 'Чи хүн бүрийг сонсдог.', body: 'Гэхдээ өөрийн дуу хоолойг сонсох хүнийг чи бас хүсдэг.' },
      { title: 'Чи зөөлөн харагддаг.', body: 'Гэхдээ зөв зүйлийн төлөө зогсох болоход гэнэтийн хатуу зориг гаргадаг.' },
    ],
    en: [
      { title: 'You seek harmony.', body: 'But to keep the peace, you quietly set your own needs aside.' },
      { title: 'You hear everyone out.', body: 'And what you also long for is someone who truly listens back.' },
      { title: 'You seem gentle.', body: 'Yet when something is truly right, you stand for it with surprising firmness.' },
    ],
  },
  scorpio: {
    mn: [
      { title: 'Чи амархан нээгддэггүй.', body: 'Гэхдээ нэгэнт хүнийг оруулбал бүх зүрхээрээ зүтгэдэг.' },
      { title: 'Чи бүгдийг гүнээ мэдэрдэг.', body: 'Гэхдээ тэр эрчмээ зөвхөн итгэдэг хүмүүстээ л харуулдаг.' },
      { title: 'Чи тайван дүр эсгэдэг.', body: 'Гэхдээ дотор чинь юу өөрчлөгдсөнийг чи хэнээс ч өмнө мэддэг.' },
    ],
    en: [
      { title: 'You do not open easily.', body: 'But once someone is truly let in, you give them all of your heart.' },
      { title: 'You feel everything intensely.', body: 'And you reveal that intensity only to the people you genuinely trust.' },
      { title: 'You stay composed on the surface.', body: 'Yet you sense what has shifted inside you long before anyone else does.' },
    ],
  },
  sagittarius: {
    mn: [
      { title: 'Чи эрх чөлөөг эрхэмлэдэг.', body: 'Гэхдээ тэр хайхрамжгүй биш, харин жинхэнэ утга учиртайг л хайдагтай холбоотой.' },
      { title: 'Чи урагшаа л хардаг.', body: 'Гэхдээ заримдаа аль хэдийн хүрсэн зүйлдээ зогсож баярлахыг хүсдэг.' },
      { title: 'Чи өөдрөгөөр инээдэг.', body: 'Гэхдээ тэр гэрэл гэгээний цаана гүнзгий бодлууд чимээгүй оршдог.' },
    ],
    en: [
      { title: 'You treasure your freedom.', body: 'But that is not carelessness — it is a search for something genuinely meaningful.' },
      { title: 'You keep looking ahead.', body: 'And sometimes you wish you could pause and enjoy how far you have already come.' },
      { title: 'You laugh with optimism.', body: 'Yet beneath that brightness live deeper thoughts you rarely show.' },
    ],
  },
  capricorn: {
    mn: [
      { title: 'Чи ачааг дангаараа үүрдэг.', body: 'Гэхдээ тусламж гуйх нь сул тал биш гэдгийг чи зөвшөөрөх ёстой.' },
      { title: 'Чи сахилга баттай харагддаг.', body: 'Гэхдээ тэр хатуу гадаргуугийн цаана гэнэтийн дулаан зүрх цохилдог.' },
      { title: 'Чи амжилтыг чимээгүй босгодог.', body: 'Гэхдээ аль хэдийн хийсэн зүйлдээ бахархах эрх чамд бий.' },
    ],
    en: [
      { title: 'You carry the weight alone.', body: 'But you are allowed to learn that asking for help is not a weakness.' },
      { title: 'You seem all discipline.', body: 'Yet behind that steady surface beats a surprisingly warm heart.' },
      { title: 'You build success quietly.', body: 'And you have every right to be proud of how much you have already done.' },
    ],
  },
  aquarius: {
    mn: [
      { title: 'Чи бусдаас өөр гэдгээ мэдэрдэг.', body: 'Гэхдээ яг тэр өвөрмөц чанар чинь хүмүүст хамгийн их хэрэгтэй зүйл юм.' },
      { title: 'Чи зайнаас санаа тавьдаг.', body: 'Гэхдээ хайр чинь холоос ч гэсэн үнэхээр гүн гүнзгий.' },
      { title: 'Чи бие даан боддог.', body: 'Гэхдээ дотроо хамаа холбоог хэнээс ч илүү эрхэмлэдэг.' },
    ],
    en: [
      { title: 'You feel different from others.', body: 'But that very difference is exactly what people need most from you.' },
      { title: 'You care from a distance.', body: 'And even from afar, your loyalty runs genuinely deep.' },
      { title: 'You think for yourself.', body: 'Yet quietly, you value true connection more than almost anyone.' },
    ],
  },
  pisces: {
    mn: [
      { title: 'Чи бусдын мэдрэмжийг шингээдэг.', body: 'Гэхдээ өөрийн мэдрэмжид анхаарал тавих орон зай чамд бас хэрэгтэй.' },
      { title: 'Чи мөрөөдөмтгий зөөлөн.', body: 'Гэхдээ тэр зөөлөн байдлын цаана хэнд ч мэдэгддэггүй гүн хүч бий.' },
      { title: 'Чи их зүйлийг хэлэлгүй ойлгодог.', body: 'Гэхдээ чамайг яг тэр чигээр нь ойлгох хүнийг чи хүсдэг.' },
    ],
    en: [
      { title: 'You absorb other people’s feelings.', body: 'But you also need space to tend to your own.' },
      { title: 'You are a gentle dreamer.', body: 'Yet beneath that softness lives a quiet strength no one suspects.' },
      { title: 'You understand without words.', body: 'And what you long for is someone who understands you just as completely.' },
    ],
  },
};

function seedFrom(parts: Array<string | null | undefined>): number {
  const text = parts.filter(Boolean).join('|');
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface OnboardingHookInput {
  sunSign: ZodiacSign;
  moonSign?: ZodiacSign | null;
  risingSign?: ZodiacSign | null;
  lang: HookLang;
}

/**
 * Pick the onboarding hook for a user. Deterministic in both inputs and language: the
 * same chart always yields the same variant, so the aha moment is stable and shareable.
 */
export function selectOnboardingHook(input: OnboardingHookInput): OnboardingHook {
  const lang: HookLang = input.lang === 'en' ? 'en' : 'mn';
  const variants = HOOKS[input.sunSign][lang];
  const seed = seedFrom([input.sunSign, input.moonSign, input.risingSign]);
  const variant = variants.length > 0 ? seed % variants.length : 0;
  const picked = variants[variant] ?? variants[0]!;
  const element = getZodiacInfo(input.sunSign).element as HookElement;
  return { sign: input.sunSign, element, variant, title: picked.title, body: picked.body };
}

/** Number of variants available for a sign/language — used by tests and tuning. */
export function hookVariantCount(sign: ZodiacSign, lang: HookLang): number {
  return HOOKS[sign][lang]?.length ?? 0;
}

export { HOOKS as ONBOARDING_HOOKS };
