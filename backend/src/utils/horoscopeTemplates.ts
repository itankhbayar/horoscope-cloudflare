import type { ZodiacSign } from './zodiac';
import { getZodiacInfo } from './zodiac';
import type { Lang } from './lang';
import type { Aspect, DailySkySnapshot, HouseCusp, NatalChartData, PlanetPosition, TransitToNatalAspect } from '../services/astrologyService';

interface PerSignText {
  overall: string[];
  love: string[];
  career: string[];
  health: string[];
}

const COLORS_EN = [
  'Crimson', 'Sapphire Blue', 'Emerald Green', 'Royal Purple', 'Sunset Orange',
  'Pearl White', 'Midnight Black', 'Rose Gold', 'Forest Green', 'Lavender',
  'Turquoise', 'Burgundy',
];

const COLORS_MN = [
  'Час улаан', 'Индигогийн хөх', 'Зүлгэн ногоон', 'Хааны нил ягаан', 'Нарны улбар шар',
  'Сувдан цагаан', 'Шөнийн хар', 'Сарнайн алт', 'Шигүү ногоон', 'Хайлаас ягаан',
  'Гялбаа цэнхэр', 'Бургунд улаан',
];

// === English templates ===

const FIRE_OVERALL_EN = [
  'Cosmic energy fuels your fire today—channel it into bold action.',
  'A spark of inspiration lights up your path; trust your instincts.',
  'You keep calling it readiness, but the real question is what desire costs when it becomes visible.',
  'Your inner flame guides important decisions today.',
];
const EARTH_OVERALL_EN = [
  'Stability and structure favor you today; build for tomorrow.',
  'Patience and persistence open the door to lasting reward.',
  'The cosmos supports careful planning; lay strong foundations.',
  'Grounded confidence carries you through any challenge.',
];
const AIR_OVERALL_EN = [
  'Ideas flow freely today; share them with someone who listens.',
  'A breath of new perspective changes your outlook entirely.',
  'Curiosity is your guide—follow it where it leads.',
  'Communication unlocks doors that strength alone could not open.',
];
const WATER_OVERALL_EN = [
  'Your intuition runs deep today; trust the feelings rising within.',
  'Emotions reveal a truth you have been avoiding; let it surface.',
  'A wave of empathy connects you to the people around you.',
  'Dreams carry messages; pay attention to what your heart whispers.',
];

const PER_SIGN_EN: Record<ZodiacSign, PerSignText> = {
  aries: {
    overall: FIRE_OVERALL_EN,
    love: [
      'A passionate encounter stirs your heart—be open to surprise.',
      'Honest words strengthen the bond you treasure most.',
      'Love rewards initiative today; make the first move.',
    ],
    career: [
      'A bold proposal earns the recognition you deserve.',
      'Lead by example and others will follow your vision.',
      'A competitive challenge brings out your best work.',
    ],
    health: [
      'Channel restless energy into vigorous movement.',
      'Take a moment to cool down; not every battle is yours.',
      'Hydration and rest will sharpen your focus.',
    ],
  },
  taurus: {
    overall: EARTH_OVERALL_EN,
    love: [
      'Sensual gestures speak louder than grand declarations.',
      'A quiet evening together deepens your connection.',
      'Loyalty is rewarded; cherish the steady hand beside you.',
    ],
    career: [
      'Slow and steady wins—stay the course you set.',
      'Financial intuition is sharp; make a thoughtful choice.',
      'Quality over speed brings the praise you seek.',
    ],
    health: [
      'Indulge in nature; a walk outside restores balance.',
      'Listen to your body; rest is medicine.',
      'Comfort food in moderation soothes the spirit.',
    ],
  },
  gemini: {
    overall: AIR_OVERALL_EN,
    love: [
      'A clever conversation sparks unexpected chemistry.',
      'Express what you feel before the moment passes.',
      'Two sides of love reveal themselves; embrace both.',
    ],
    career: [
      'Networking opens a door you did not know existed.',
      'Wear many hats today; versatility is your superpower.',
      'A bright idea lands at exactly the right moment.',
    ],
    health: [
      'Mental rest is as vital as physical rest—unplug.',
      'Breathing exercises calm a busy mind.',
      'Stay curious but pace yourself; energy fluctuates.',
    ],
  },
  cancer: {
    overall: WATER_OVERALL_EN,
    love: [
      'Vulnerability becomes your strength in love today.',
      'A small act of care speaks volumes to someone special.',
      'Home and heart align; create a moment of warmth.',
    ],
    career: [
      'Your nurturing leadership inspires the team.',
      'Trust your gut on a decision others doubt.',
      'A meaningful project deserves your full attention.',
    ],
    health: [
      'Emotional release is healing; let the tears flow if needed.',
      'A warm bath or comforting ritual restores you.',
      'Protect your peace; choose calm environments.',
    ],
  },
  leo: {
    overall: FIRE_OVERALL_EN,
    love: [
      'Romance shines bright; let your heart roar.',
      'A grand gesture is welcomed and remembered.',
      'Generosity in love returns to you tenfold.',
    ],
    career: [
      'You are in the spotlight—own it with confidence.',
      'Creative work earns admiration today.',
      'A leadership opportunity is yours for the taking.',
    ],
    health: [
      'Movement that makes you feel powerful is best.',
      'Take pride in caring for your body—it serves you well.',
      'Sunshine and stretching lift your mood.',
    ],
  },
  virgo: {
    overall: EARTH_OVERALL_EN,
    love: [
      'Small acts of service reveal the depth of your love.',
      'Honest communication clears a misunderstanding.',
      'A practical conversation strengthens trust.',
    ],
    career: [
      'Attention to detail wins you a key advantage.',
      'Organization brings clarity to a complex task.',
      'Helping a colleague pays unexpected dividends.',
    ],
    health: [
      'A mindful routine grounds you all day.',
      'Nutritious choices have an outsized impact today.',
      'Release perfectionism; good enough is enough.',
    ],
  },
  libra: {
    overall: AIR_OVERALL_EN,
    love: [
      'Harmony returns to a relationship that needed mending.',
      'A balanced exchange of feelings brings you closer.',
      'Beauty surrounds you—share it with someone you love.',
    ],
    career: [
      'Diplomacy resolves a tense situation gracefully.',
      'A partnership produces something neither could alone.',
      'Aesthetic decisions favor your refined eye.',
    ],
    health: [
      'Balance is key; alternate effort with rest.',
      'Beautiful surroundings nurture wellbeing.',
      'Gentle movement and music soothe the soul.',
    ],
  },
  scorpio: {
    overall: WATER_OVERALL_EN,
    love: [
      'Intense connection runs deeper than words can describe.',
      'A truth shared in trust transforms the relationship.',
      'Passion flares; let it guide rather than consume you.',
    ],
    career: [
      'Strategic insight gives you the edge today.',
      'A hidden opportunity reveals itself to your sharp eye.',
      'Persistence breaks through what seemed impossible.',
    ],
    health: [
      'Transformation begins with a single mindful choice.',
      'Release what no longer serves your body.',
      'Deep breathing channels intense emotion.',
    ],
  },
  sagittarius: {
    overall: FIRE_OVERALL_EN,
    love: [
      'Adventure invites a new chapter in your love story.',
      'Honesty opens hearts—speak your truth kindly.',
      'A shared dream brings you closer than ever.',
    ],
    career: [
      'Expand your horizons; an unfamiliar path leads to growth.',
      'Optimism is contagious—lift the team with your vision.',
      'A learning opportunity sharpens your future.',
    ],
    health: [
      'Travel or movement renews your vitality.',
      'Pursue activity that feels like play, not work.',
      'Stretch beyond your usual routine.',
    ],
  },
  capricorn: {
    overall: EARTH_OVERALL_EN,
    love: [
      'Patient love builds the strongest foundation.',
      'A traditional gesture surprises and delights.',
      'Commitment deepens through quiet, consistent care.',
    ],
    career: [
      'Long-term planning pays off—stay disciplined.',
      'A respected mentor offers guidance worth heeding.',
      'Hard work today is tomorrow\'s reputation.',
    ],
    health: [
      'Structure your routine; consistency yields results.',
      'Bone and joint health benefit from gentle strength work.',
      'Rest is productive; take it without guilt.',
    ],
  },
  aquarius: {
    overall: AIR_OVERALL_EN,
    love: [
      'Friendship and love overlap beautifully today.',
      'An unconventional gesture shows your unique heart.',
      'Independence and intimacy can coexist—you prove it.',
    ],
    career: [
      'An innovative solution turns heads.',
      'Collaboration with diverse minds yields breakthrough.',
      'Your vision of the future inspires others.',
    ],
    health: [
      'Try something new—novelty energizes you.',
      'Community wellness activities feed your spirit.',
      'Stay grounded in your body amidst grand ideas.',
    ],
  },
  pisces: {
    overall: WATER_OVERALL_EN,
    love: [
      'A poetic moment lingers in your memory.',
      'Compassion heals an old wound between you and a loved one.',
      'Dreams and reality blur in the most beautiful way.',
    ],
    career: [
      'Creative imagination is your competitive edge today.',
      'Empathy guides you toward the right collaborator.',
      'Trust the subtle signals; they point to opportunity.',
    ],
    health: [
      'Water in any form—drink, swim, soak—heals you.',
      'Quiet meditation clarifies a foggy day.',
      'Honor your sensitivity; protect your energy.',
    ],
  },
};

// === Mongolian templates ===

const FIRE_OVERALL_MN = [
  'Орчлонгийн эрч хүч таны галыг өдөөж байна—зориглон үйлдэлд шилжүүл.',
  'Урам зоригийн оч таны замыг гэрэлтүүлж байна; зөн совингоо итгэ.',
  'Орчлон эр зоригийг шагнадаг; тав тухтай бүсээсээ гар.',
  'Дотоод дөл чинь өнөөдрийн чухал шийдвэрүүдийг чиглүүлнэ.',
];
const EARTH_OVERALL_MN = [
  'Тогтвортой байдал, бүтэц өнөөдөр таны талд—маргаашийн тулд бүтээ.',
  'Тэвчээр, тууштай байдал удаан хүртэх шагналын хаалгыг нээнэ.',
  'Орчлон болгоомжтой төлөвлөлтийг дэмжиж байна; бат суурийг тавь.',
  'Газраас баттай итгэл чинь ямар ч сорилтыг даван туулна.',
];
const AIR_OVERALL_MN = [
  'Санаанууд чөлөөтэй урсаж байна; сонсож чадах хүнтэй хуваалц.',
  'Шинэ өнцгийн салхи таны үзэл бодлыг бүрэн өөрчилнө.',
  'Сониуч зан чинь жолоодогч—түүний хүссэн зам руу яв.',
  'Харилцаа ганц хүч чадлаар нээж чадаагүй хаалгыг нээнэ.',
];
const WATER_OVERALL_MN = [
  'Зөн чинь өнөөдөр гүн ажиллана; дотроос гарч ирэх мэдрэмжид итгэ.',
  'Сэтгэл хөдлөл чинь зайлсхийж байсан үнэнийг гаргана; гарга.',
  'Энэрэн нигүүлсэх давалгаа таныг эргэн тойрны хүмүүстэй холбоно.',
  'Зүүд зурвас дамжуулна; зүрх чинь юу шивнэхийг анхаар.',
];

const PER_SIGN_MN: Record<ZodiacSign, PerSignText> = {
  aries: {
    overall: FIRE_OVERALL_MN,
    love: [
      'Хүсэл тэмүүлэлтэй уулзалт зүрхийг чинь хөдөлгөнө—гэнэтийн зүйлд бэлэн бай.',
      'Үнэнч үг хамгийн нандин холбоог чанга болгоно.',
      'Хайр өнөөдөр санаачлагыг шагнана; эхний алхмыг хий.',
    ],
    career: [
      'Зоригтой санал танд зохих хүндэтгэлийг авчирна.',
      'Үлгэр жишээгээр манлай, бусад чиний алсын харааг дагах болно.',
      'Өрсөлдөөнт сорилт танаас хамгийн сайныг гаргана.',
    ],
    health: [
      'Тайван бус эрчээ хүчтэй хөдөлгөөнд шилжүүл.',
      'Жаахан амар; тэр болгон чинийх биш.',
      'Ус ууж, амрахад анхаарал чинь хурц болно.',
    ],
  },
  taurus: {
    overall: EARTH_OVERALL_MN,
    love: [
      'Дэлгэр тансаг зан агуу мэдэгдлээс илүү ярина.',
      'Хамтдаа өнгөрөөсөн нам гүм орой холбоог гүнзгийрүүлнэ.',
      'Үнэнч байдал шагнагдана; хажуу дахь тогтвортой гарт талархаарай.',
    ],
    career: [
      'Удаан тогтвортой нь ялна—сонгосон замаа хадгал.',
      'Санхүүгийн зөн совин хурц байна; ухаалаг сонголт хий.',
      'Хурдны оронд чанар таны хүссэн магтаалыг авчирна.',
    ],
    health: [
      'Байгальд цаг гарга; гадуур алхах нь тэнцвэрийг сэргээнэ.',
      'Биеэ сонс; амралт бол эм.',
      'Дотоод тайвшрал өгдөг хоол хэмжээгээр сэтгэлийг тайвшруулна.',
    ],
  },
  gemini: {
    overall: AIR_OVERALL_MN,
    love: [
      'Ухаалаг яриа гэнэтийн химийн урвалыг өдөөнө.',
      'Мөч өнгөрөхөөс өмнө мэдрэмжээ илэрхийл.',
      'Хайрын хоёр тал илэрнэ; хоёуланг нь хүлээж ав.',
    ],
    career: [
      'Сүлжээ танд мэдээгүй байсан хаалгыг нээнэ.',
      'Олон үүрэг гүйцэтгэ; уян хатан байдал чинь супер хүч.',
      'Гэрэлт санаа яг зөв мөчид төрнө.',
    ],
    health: [
      'Сэтгэцийн амралт бие махбодын амралттай адил чухал—салгагдаарай.',
      'Амьсгалын дасгал тайван биш ухааныг тайвшруулна.',
      'Сониуч бай ч хурдаа хадгал; эрч хүч хэлбэлзэнэ.',
    ],
  },
  cancer: {
    overall: WATER_OVERALL_MN,
    love: [
      'Өнөөдөр эмзэг байдал чинь хайрын хүч чадал болно.',
      'Жижигхэн анхаарал онцгой хүнд олныг хэлнэ.',
      'Гэр болон зүрх нэгдэнэ; дулаан мөчийг бүтээ.',
    ],
    career: [
      'Халамжит манлайлал чинь багийг урамшуулна.',
      'Бусад эргэлзэж буй шийдвэрт зөнгөө итгэ.',
      'Утга учиртай төсөл бүх анхаарлыг чинь шаардана.',
    ],
    health: [
      'Сэтгэл хөдлөлийн чөлөөлөлт эдгээдэг; нулимс асгарах хэрэгтэй бол асга.',
      'Дулаан усанд орох эсвэл тайвшруулах зан үйл сэргээнэ.',
      'Тайван байдлаа хамгаал; намуун орчныг сонго.',
    ],
  },
  leo: {
    overall: FIRE_OVERALL_MN,
    love: [
      'Романтик цацарч байна; зүрхээ архирах эрхийг өг.',
      'Том өргөмжлөл хүлээн зөвшөөрөгдөж, дурсагдана.',
      'Хайрт нинж сэтгэл арав дахин эргэнэ.',
    ],
    career: [
      'Та анхаарлын төвд байна—итгэлтэйгээр эзэмш.',
      'Бүтээлч ажил өнөөдөр магтаал авна.',
      'Манлайлах боломж танд бэлэн байна.',
    ],
    health: [
      'Хүчирхэг мэдрүүлдэг хөдөлгөөн хамгийн сайн.',
      'Биеэ халамжлахдаа бахархаарай—тэр чамд сайн үйлчилнэ.',
      'Нар, суналт сэтгэл санааг өргөнө.',
    ],
  },
  virgo: {
    overall: EARTH_OVERALL_MN,
    love: [
      'Жижиг үйлчилгээ хайрын гүнийг илчлэнэ.',
      'Үнэнч харилцаа үл ойлголцлыг арилгана.',
      'Бодит яриа итгэлийг бэхжүүлнэ.',
    ],
    career: [
      'Нарийн анхаарал танд гол давуу талыг өгнө.',
      'Зохион байгуулалт нарийн ажилд тодорхой байдал авчирна.',
      'Хамт ажиллагсаддаа туслах нь гэнэтийн ашиг авчирна.',
    ],
    health: [
      'Анхаарлын дэглэм өдөржингөө таныг газардуулна.',
      'Шим тэжээлтэй сонголт өнөөдөр илүү их нөлөөтэй.',
      'Төгс байх хүсэлээ тавь; хангалттай нь хангалттай.',
    ],
  },
  libra: {
    overall: AIR_OVERALL_MN,
    love: [
      'Засах шаардлагатай харилцаанд эв нэгдэл буцаж ирнэ.',
      'Тэнцвэртэй мэдрэмжийн солилцоо ойртуулна.',
      'Гоо сайхан таныг хүрээлж байна—хайртай хүндээ хуваалц.',
    ],
    career: [
      'Дипломат хандлага хурц нөхцөлийг гоё шийднэ.',
      'Хамтын ажиллагаа дангаар хийж чадахгүй зүйлийг бүтээнэ.',
      'Гоо зүйн шийдвэр таны нарийн нүдэнд таалагдана.',
    ],
    health: [
      'Тэнцвэр гол; хүчээ амралттай хослуул.',
      'Үзэсгэлэнт орчин эрүүл мэндийг тэжээнэ.',
      'Зөөлөн хөдөлгөөн, хөгжим сэтгэлийг тайвшруулна.',
    ],
  },
  scorpio: {
    overall: WATER_OVERALL_MN,
    love: [
      'Эрчимтэй холбоо үгээр илэрхийлэхээс гүн.',
      'Итгэлээр хуваалцсан үнэн харилцааг өөрчилнө.',
      'Хүсэл шатаж байна; чамайг залуурдахаас илүү залуурд.',
    ],
    career: [
      'Стратегийн ойлголт танд давуу талыг өгнө.',
      'Нуугдмал боломж таны хурц нүдэнд илчлэгдэнэ.',
      'Тэвчээр боломжгүй мэт байсныг даван туулна.',
    ],
    health: [
      'Өөрчлөлт нэг ухаалаг сонголтоор эхэлнэ.',
      'Биед чинь хэрэггүй болсон зүйлсээ суллаарай.',
      'Гүн амьсгалаа эрчимтэй сэтгэл хөдлөлийг залуур.',
    ],
  },
  sagittarius: {
    overall: FIRE_OVERALL_MN,
    love: [
      'Адал явдал чиний хайрын түүхэнд шинэ бүлгийг урина.',
      'Үнэнч зан зүрхийг нээнэ—үнэнээ эелдгээр хэл.',
      'Хамтран хувааж буй мөрөөдөл өмнөхөөс илүү ойртуулна.',
    ],
    career: [
      'Хүрээгээ тэлэх; танил бус зам өсөлтөд хүргэнэ.',
      'Өөдрөг үзэл халдварлана—алсын харагдхуйгаар багийг өргө.',
      'Сурах боломж ирээдүйг хурцлана.',
    ],
    health: [
      'Аялал, хөдөлгөөн амьдрах эрч хүчийг сэргээнэ.',
      'Ажил мэт биш тоглоом мэт мэдрэгдэх үйл ажиллагааг хий.',
      'Ердийн дэглэмээсээ давж сунаарай.',
    ],
  },
  capricorn: {
    overall: EARTH_OVERALL_MN,
    love: [
      'Тэвчээртэй хайр хамгийн бат суурийг тавина.',
      'Уламжлалт өргөмжлөл гэнэтийн тааламжтай байна.',
      'Үүрэг амлалт нам гүм, тогтвортой халамжаар гүнзгийрнэ.',
    ],
    career: [
      'Урт хугацааны төлөвлөлт өгөөжөө өгнө—хатуу сахилгатай бай.',
      'Хүндэтгэлтэй зөвлөгчийн зөвлөгөөг сонсох нь зүйтэй.',
      'Өнөөдрийн шаргуу хөдөлмөр маргаашийн нэр хүнд.',
    ],
    health: [
      'Дэглэмээ зохион байгуул; тогтмолжилт үр дүн өгнө.',
      'Зөөлөн хүч чадлын дасгал яс, үений эрүүл мэндэд тустай.',
      'Амралт бүтээмжтэй; гэм буруугүйгээр амраарай.',
    ],
  },
  aquarius: {
    overall: AIR_OVERALL_MN,
    love: [
      'Нөхөрлөл, хайр өнөөдөр гайхамшигтай давхцана.',
      'Уламжлалт бус өргөмжлөл таны өвөрмөц зүрхийг харуулна.',
      'Бие даасан байдал, дотно харилцаа зэрэгцэн оршиж чадна—чи үүнийг батална.',
    ],
    career: [
      'Шинэлэг шийдэл анхаарал татна.',
      'Олон янзын ухаантай хамтран ажиллах нь нээлт авчирна.',
      'Таны ирээдүйн алсын хараа бусдыг урамшуулна.',
    ],
    health: [
      'Шинэ зүйл туршаарай—шинэлэг зүйл эрчимжүүлнэ.',
      'Олон нийтийн эрүүл мэндийн үйл ажиллагаа сэтгэлийг тэжээнэ.',
      'Том санаануудын дунд биедээ суурьшсан хэвээр бай.',
    ],
  },
  pisces: {
    overall: WATER_OVERALL_MN,
    love: [
      'Шүлэгт мөч санаанд тань үлдэнэ.',
      'Энэрэнгүй сэтгэл хайртай хүнтэйгээ өмнө гарсан гэмтлийг эдгээнэ.',
      'Зүүд, бодит байдал хамгийн үзэсгэлэнтэйгээр уусна.',
    ],
    career: [
      'Бүтээлч төсөөлөл өнөөдрийн өрсөлдөх давуу тал чинь.',
      'Энэрэнгүй сэтгэл зөв хамтрагч руу залуурдана.',
      'Анхааралтай дохиог итгэ; тэдгээр нь боломжийг заана.',
    ],
    health: [
      'Аливаа хэлбэрийн ус—уух, сэлэх, шингэх—чамайг эдгээнэ.',
      'Нам гүм бясалгал манантай өдрийг тодруулна.',
      'Мэдрэмжээ хүндэл; эрчээ хамгаал.',
    ],
  },
};

const BUNDLES: Record<Lang, { perSign: Record<ZodiacSign, PerSignText>; colors: string[] }> = {
  en: { perSign: PER_SIGN_EN, colors: COLORS_EN },
  mn: { perSign: PER_SIGN_MN, colors: COLORS_MN },
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function seedFromSignAndDate(sign: ZodiacSign, dateISO: string): number {
  let h = 0;
  const text = `${sign}-${dateISO}`;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface DailyHoroscopeContent {
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
  skyContext?: DailySkyContext;
}

export interface DailySkyContext {
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  moonPhase: string;
  focusTransit?: {
    transitBody: string;
    natalBody: string;
    aspect: string;
    orb: number;
    natalHouse?: number;
    transitSign: ZodiacSign;
    natalSign: ZodiacSign;
  };
}

export interface DailyHoroscopeGenerationOptions {
  sky?: DailySkySnapshot;
  natalChart?: PersonalizedChartContext | null;
  transitAspects?: TransitToNatalAspect[];
}

export interface PersonalizedChartContext {
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign | null;
  planets: NatalChartData['planets'] | PlanetPosition[];
  houses: NatalChartData['houses'] | HouseCusp[];
  aspects: NatalChartData['aspects'] | Aspect[];
}

export function generateDailyHoroscope(
  sign: ZodiacSign,
  dateISO: string,
  lang: Lang,
  options: DailyHoroscopeGenerationOptions = {},
): DailyHoroscopeContent {
  const bundle = BUNDLES[lang] ?? BUNDLES.en;
  const data = bundle.perSign[sign];
  const seed = seedFromSignAndDate(sign, dateISO);
  const fallback = {
    overall: pick(data.overall, seed),
    love: pick(data.love, seed >> 2),
    career: pick(data.career, seed >> 4),
    health: pick(data.health, seed >> 6),
    luckyNumber: (seed % 99) + 1,
    luckyColor: pick(bundle.colors, seed >> 8),
  };
  if (!options.sky || lang !== 'en') return fallback;
  return buildAstronomyAwareReading(sign, dateISO, fallback, options);
}

export function enrichDailyHoroscope(
  content: DailyHoroscopeContent,
  sign: ZodiacSign,
  dateISO: string,
  lang: Lang,
  options: DailyHoroscopeGenerationOptions,
): DailyHoroscopeContent {
  if (!options.sky || lang !== 'en') return content;
  return buildAstronomyAwareReading(sign, dateISO, content, options);
}

function buildAstronomyAwareReading(
  sign: ZodiacSign,
  dateISO: string,
  base: DailyHoroscopeContent,
  options: DailyHoroscopeGenerationOptions,
): DailyHoroscopeContent {
  const sky = options.sky;
  if (!sky) return base;
  const sun = sky.planets.find((p) => p.name === 'Sun');
  const moon = sky.planets.find((p) => p.name === 'Moon');
  const mercury = sky.planets.find((p) => p.name === 'Mercury');
  if (!sun || !moon) return base;

  const signName = getZodiacInfo(sign).name;
  const sunName = getZodiacInfo(sun.sign).name;
  const moonName = getZodiacInfo(moon.sign).name;
  const focusTransit = selectFocusTransit(options.transitAspects ?? []);
  const skyContext = buildSkyContext(sun.sign, moon.sign, sky.moonPhase.name, focusTransit);
  const seed = seedFromSignAndDate(sign, dateISO);
  const mercuryName = mercury ? getZodiacInfo(mercury.sign).name : null;
  const phase = sky.moonPhase.name.toLowerCase();

  if (options.natalChart) {
    const natal = options.natalChart;
    const moonHouse = findNatalHouse(moon.longitude, natal.houses);
    const natalSunName = getZodiacInfo(natal.sunSign).name;
    const natalMoonName = getZodiacInfo(natal.moonSign).name;
    const risingSign = natal.risingSign;
    const risingName = risingSign ? getZodiacInfo(risingSign).name : null;
    const socialHouse = focusTransit?.natalHouse ?? moonHouse;
    const timing = focusTransit
      ? `Timing cue: ${planetLabel(focusTransit.transitBody)} ${aspectLabel(focusTransit.type)} your natal ${planetLabel(focusTransit.natalBody)}${houseClause(focusTransit.natalHouse)} at a ${focusTransit.orb.toFixed(1)} degree orb.`
      : `Timing cue: no tight major transit dominates your stored natal planets, so today's pressure comes through the Moon in ${moonName}${moonHouse ? ` moving across your ${ordinal(moonHouse)} house` : ''}.`;
    const chartLead = `For your ${natalSunName} Sun and ${natalMoonName} Moon${risingName ? ` with ${risingName} rising` : ''}`;

    return {
      ...base,
      skyContext,
      overall: `${chartLead}, ${personalTension(natal.moonSign, seed)} ${risingSign ? risingBehavior(risingSign, seed >> 1) : sunBehavior(natal.sunSign, seed >> 1)} ${hiddenDesireOrFear(natal.sunSign, natal.moonSign, seed >> 2)} ${timing} Let the day show you where the performance is heavier than the truth.`,
      love: `${relationshipSignal(moon.sign, seed)} ${socialHouse ? `It may land through ${houseRelationshipCue(socialHouse)}` : `It may show up in the gap between what you say and what you hope someone notices`}. ${focusTransit ? `Because ${planetLabel(focusTransit.transitBody)} is pressing your natal ${planetLabel(focusTransit.natalBody)}, a small change in tone can say more than the official conversation.` : `The Moon in ${moonName} makes indirect signals louder than planned speeches.`}`,
      career: `${workSignal(sun.sign, mercury?.sign ?? sun.sign, seed)} ${mercuryName ? `Mercury in ${mercuryName} shapes the wording, so clean up the message before you push the decision.` : `The message matters as much as the decision.`} If you feel behind, check whether you are chasing urgency or trying to earn permission.`,
      health: `With the Moon in ${moonName}${moonHouse ? ` crossing your ${ordinal(moonHouse)} house` : ''} during a ${phase} phase, your system may want ${bodyCueForMoon(moon.sign)}. Keep it ordinary and repeatable; the point is to stop overriding the signal.`,
    };
  }

  return {
    ...base,
    skyContext,
    overall: `${publicOpening(signName, seed)} The Sun in ${sunName} brings ${solarTheme(sun.sign)}, while the Moon in ${moonName} pulls up ${lunarTheme(moon.sign)} during a ${phase} phase. ${publicTension(moon.sign, seed >> 1)} End the day by naming the thing you kept negotiating with yourself.`,
    love: `${relationshipSignal(moon.sign, seed)} The Moon in ${moonName} makes ${relationshipTheme(moon.sign)} easier to read, especially in pauses, replies, and the tone someone uses when they think they are being casual.`,
    career: `${workSignal(sun.sign, mercury?.sign ?? sun.sign, seed)} ${mercuryName ? `Mercury in ${mercuryName} affects how fast people understand the point.` : `The point needs a cleaner shape before it needs more force.`} Precision matters more than urgency.`,
    health: `The ${phase} phase favors ${moonPhaseCare(sky.moonPhase.name)}. Let ${moonName} set the pace: ${bodyCueForMoon(moon.sign)} is enough of a ritual for today.`,
  };
}

function publicOpening(signName: string, seed: number): string {
  return pick([
    `${signName}, the mood is not dramatic, but it is precise.`,
    `${signName}, notice what you keep almost saying and then editing down.`,
    `${signName}, the day has a private pressure point around honesty.`,
    `${signName}, the obvious task may not be the real story.`,
  ], seed);
}

function publicTension(moonSign: ZodiacSign, seed: number): string {
  const info = getZodiacInfo(moonSign);
  switch (info.element) {
    case 'fire':
      return pick([
        'You may call it momentum, but part of you is trying to outrun the feeling.',
        'A quick reaction could reveal the desire you were trying to make look casual.',
        'The irritation is probably less about the moment and more about not feeling chosen quickly enough.',
      ], seed);
    case 'earth':
      return pick([
        'You may call it patience, but part of you has been emotionally stalled.',
        'The need for proof is real; the habit of withholding warmth until proof arrives may cost more than it protects.',
        'Something steady may feel heavy only because you have been carrying it without admitting the weight.',
      ], seed);
    case 'air':
      return pick([
        'You can explain the feeling elegantly, but the explanation may be helping you avoid needing it.',
        'A conversation may sound light while carrying a much sharper question underneath.',
        'You may be waiting for the perfect wording because plain need feels too exposed.',
      ], seed);
    case 'water':
      return pick([
        'You have been performing calm so convincingly that even you almost believed it.',
        'A small shift in tone may hit harder than expected, especially from someone whose approval you pretend not to need.',
        'The feeling is older than the situation, which does not make it false.',
      ], seed);
  }
}

function personalTension(moonSign: ZodiacSign, seed: number): string {
  const info = getZodiacInfo(moonSign);
  switch (info.element) {
    case 'fire':
      return pick([
        'your emotional weather is impatient with anything that makes desire look too needy.',
        'you may be pushing for a clean answer because waiting feels like losing authority over yourself.',
        'the sharp feeling under the surface is not anger exactly; it is wanting to be met without having to perform confidence first.',
      ], seed);
    case 'earth':
      return pick([
        'you keep calling it being realistic, but some part of you has been asking for reassurance in a quieter language.',
        'your steadiness is useful until it becomes a costume for disappointment.',
        'you may be holding the practical line because admitting the softer need would change the whole negotiation.',
      ], seed);
    case 'air':
      return pick([
        'your mind can make the situation sound manageable before your body has agreed.',
        'you may be translating a raw feeling into analysis because analysis lets you stay impressive.',
        'the sentence you keep revising is probably less important than the need underneath it.',
      ], seed);
    case 'water':
      return pick([
        'you have been carrying a feeling that wants witness, not a solution.',
        'your sensitivity is picking up the room before the room has admitted anything.',
        'the tenderness you are protecting may be exactly where the honest information lives.',
      ], seed);
  }
}

function risingBehavior(risingSign: ZodiacSign, seed: number): string {
  const info = getZodiacInfo(risingSign);
  switch (info.element) {
    case 'fire':
      return pick([
        'Outwardly, you may move first and explain later, which makes hesitation feel like betrayal.',
        'People may see certainty before they notice how carefully you are testing the room.',
        'Your face may say ready before your nervous system has caught up.',
      ], seed);
    case 'earth':
      return pick([
        'Outwardly, you may look composed enough that people forget to ask what it costs.',
        'You may default to being useful when what you actually want is to be considered.',
        'Your restraint reads as confidence, even when it is partly self-protection.',
      ], seed);
    case 'air':
      return pick([
        'Outwardly, you may keep things conversational so nobody can tell where it touched you.',
        'You may become clever right where you most need to be simple.',
        'People may hear your nuance and miss the ache inside it.',
      ], seed);
    case 'water':
      return pick([
        'Outwardly, you may soften the room while privately tracking every emotional temperature change.',
        'You may offer care before naming what you need back.',
        'People may feel your warmth before they understand your boundary.',
      ], seed);
  }
}

function sunBehavior(sunSign: ZodiacSign, seed: number): string {
  const info = getZodiacInfo(sunSign);
  switch (info.element) {
    case 'fire':
      return pick([
        'You may try to solve the discomfort by taking action before the desire is fully honest.',
        'The instinct to be brave is real, but bravery does not have to arrive as speed.',
      ], seed);
    case 'earth':
      return pick([
        'You may try to make the feeling useful before you let it be true.',
        'The practical answer is not wrong; it is just not the whole confession.',
      ], seed);
    case 'air':
      return pick([
        'You may try to name every angle except the one that makes you vulnerable.',
        'The thought is moving faster than the feeling, so give both a little room.',
      ], seed);
    case 'water':
      return pick([
        'You may absorb the mood around you and then wonder why your own signal is hard to hear.',
        'The emotional truth is already present; it just may not be convenient.',
      ], seed);
  }
}

function hiddenDesireOrFear(sunSign: ZodiacSign, moonSign: ZodiacSign, seed: number): string {
  const sun = getZodiacInfo(sunSign).element;
  const moon = getZodiacInfo(moonSign).element;
  if (sun === 'fire' || moon === 'fire') {
    return pick([
      'The hidden desire is to be wanted without having to make the first brave move.',
      'The fear is that slowing down will make the answer disappear.',
    ], seed);
  }
  if (sun === 'earth' || moon === 'earth') {
    return pick([
      'The hidden desire is for someone to notice the labor you stopped advertising.',
      'The fear is that asking directly will make the need feel less dignified.',
    ], seed);
  }
  if (sun === 'air' || moon === 'air') {
    return pick([
      'The hidden desire is to be understood before you have to overexplain yourself.',
      'The fear is that plain emotional language will leave you with nowhere clever to hide.',
    ], seed);
  }
  return pick([
    'The hidden desire is to be held in mind without having to keep proving your tenderness.',
    'The fear is that needing more will make you harder to love.',
  ], seed);
}

function relationshipSignal(moonSign: ZodiacSign, seed: number): string {
  const info = getZodiacInfo(moonSign);
  switch (info.element) {
    case 'fire':
      return pick([
        'In connection, watch the first impulse to test whether someone will follow your heat.',
        'Someone may respond to your directness, but the softer request underneath it matters more.',
        'Flirtation, irritation, and honesty may stand closer together than usual.',
      ], seed);
    case 'earth':
      return pick([
        'In connection, reliability matters, but so does the tenderness behind the reliable act.',
        'Someone may be measuring care through consistency, timing, or what gets remembered.',
        'A quiet gesture can expose more truth than a polished conversation.',
      ], seed);
    case 'air':
      return pick([
        'In connection, the subtext may travel through timing, punctuation, and what gets left unsaid.',
        'Someone may need curiosity more than reassurance, at least at first.',
        'A light exchange can carry a serious question about whether you are being truly heard.',
      ], seed);
    case 'water':
      return pick([
        'In connection, small changes in tone may hit harder today.',
        'Someone may be asking for safety without using the official language of need.',
        'The emotional truth may arrive through memory, silence, or a reaction that feels bigger than the moment.',
      ], seed);
  }
}

function houseRelationshipCue(house: number): string {
  switch (house) {
    case 1:
      return 'how visible, chosen, or exposed you feel';
    case 2:
      return 'worth, reassurance, and the need to feel valued without bargaining';
    case 3:
      return 'texts, tone, siblings, neighbors, or the small daily language of care';
    case 4:
      return 'home, family patterns, and the private self you rarely perform';
    case 5:
      return 'desire, romance, play, and the risk of being openly pleased';
    case 6:
      return 'routine, labor, and whether care has become another task';
    case 7:
      return 'partnership, projection, and the person who mirrors what you avoid naming';
    case 8:
      return 'trust, vulnerability, money shared with others, and the fear of owing too much';
    case 9:
      return 'distance, belief, travel, and the story you use to make longing noble';
    case 10:
      return 'reputation, ambition, and the approval you pretend not to need';
    case 11:
      return 'friends, groups, and the uneasy wish to belong without shrinking';
    case 12:
      return 'privacy, old grief, and the pattern you keep trying to outgrow quietly';
    default:
      return 'the part of life asking for a more honest exchange';
  }
}

function workSignal(sunSign: ZodiacSign, mercurySign: ZodiacSign, seed: number): string {
  const sun = getZodiacInfo(sunSign).element;
  const mercury = getZodiacInfo(mercurySign).element;
  if (sun === 'fire' || mercury === 'fire') {
    return pick([
      'At work, the useful move is direct, but not impulsive.',
      'A decision wants courage, though the timing still deserves respect.',
      'You may want to force momentum where one honest sentence would do more.',
    ], seed);
  }
  if (sun === 'earth' || mercury === 'earth') {
    return pick([
      'At work, the useful move is to make the vague thing measurable.',
      'A practical detail may reveal who has actually been paying attention.',
      'You do not need to carry the whole structure just because you can see where it is weak.',
    ], seed);
  }
  if (sun === 'air' || mercury === 'air') {
    return pick([
      'At work, the useful move is to name the pattern before reacting to the noise.',
      'A message may need less polish and more precision.',
      'The room may be waiting for someone to say the obvious thing without making it dramatic.',
    ], seed);
  }
  return pick([
    'At work, the useful move is to trust the quiet signal without turning it into a speech.',
    'A subtle mood shift may tell you which conversation needs better boundaries.',
    'You may be reading the emotional weather correctly; just do not volunteer to manage all of it.',
  ], seed);
}

function buildSkyContext(
  sunSign: ZodiacSign,
  moonSign: ZodiacSign,
  moonPhase: string,
  focusTransit?: TransitToNatalAspect,
): DailySkyContext {
  return {
    sunSign,
    moonSign,
    moonPhase,
    focusTransit: focusTransit
      ? {
          transitBody: focusTransit.transitBody,
          natalBody: focusTransit.natalBody,
          aspect: focusTransit.type,
          orb: focusTransit.orb,
          natalHouse: focusTransit.natalHouse,
          transitSign: focusTransit.transitSign,
          natalSign: focusTransit.natalSign,
        }
      : undefined,
  };
}

function selectFocusTransit(aspects: TransitToNatalAspect[]): TransitToNatalAspect | undefined {
  const priority = ['Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  return [...aspects]
    .filter((a) => a.orb <= 3.5)
    .sort((a, b) => {
      const orb = a.orb - b.orb;
      if (orb !== 0) return orb;
      return priority.indexOf(a.transitBody) - priority.indexOf(b.transitBody);
    })[0];
}

function findNatalHouse(longitude: number, houses: HouseCusp[] | NatalChartData['houses']): number | undefined {
  if (!houses.length) return undefined;
  for (let i = 0; i < houses.length; i += 1) {
    const start = houses[i].longitude;
    const end = houses[(i + 1) % houses.length].longitude;
    const diff = normalizeAngle(longitude - start);
    const span = normalizeAngle(end - start) || 360;
    if (diff < span) return houses[i].number;
  }
  return undefined;
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function planetLabel(planet: string): string {
  return planet;
}

function aspectLabel(aspect: string): string {
  return aspect.replace(/_/g, ' ');
}

function houseClause(house?: number): string {
  return house ? ` in the ${ordinal(house)} house` : '';
}

function ordinal(value: number): string {
  const suffix = value === 1 ? 'st' : value === 2 ? 'nd' : value === 3 ? 'rd' : 'th';
  return `${value}${suffix}`;
}

function solarTheme(sign: ZodiacSign): string {
  const info = getZodiacInfo(sign);
  switch (info.element) {
    case 'fire':
      return 'clean action and visible courage';
    case 'earth':
      return 'steady choices with real-world consequences';
    case 'air':
      return 'clear language, pattern recognition, and perspective';
    case 'water':
      return 'emotional intelligence and subtle timing';
  }
}

function lunarTheme(sign: ZodiacSign): string {
  const info = getZodiacInfo(sign);
  switch (info.element) {
    case 'fire':
      return 'instinct that wants movement';
    case 'earth':
      return 'a need for steadiness and proof';
    case 'air':
      return 'feelings that become clearer when spoken';
    case 'water':
      return 'private emotion rising close to the surface';
  }
}

function relationshipTheme(sign: ZodiacSign): string {
  const info = getZodiacInfo(sign);
  switch (info.element) {
    case 'fire':
      return 'warmth, candor, and a brave first sentence';
    case 'earth':
      return 'reliability, touch, and small promises kept';
    case 'air':
      return 'curiosity, listening, and room for nuance';
    case 'water':
      return 'tenderness, memory, and emotional safety';
  }
}

function bodyCueForMoon(sign: ZodiacSign): string {
  const info = getZodiacInfo(sign);
  switch (info.element) {
    case 'fire':
      return 'warm movement, sunlight, or a short burst of effort';
    case 'earth':
      return 'food, rest, texture, and a slower nervous system';
    case 'air':
      return 'breath, space, and fewer competing inputs';
    case 'water':
      return 'hydration, softness, and a little privacy';
  }
}

function moonPhaseCare(phase: string): string {
  if (phase.includes('New')) return 'beginning quietly, without needing proof yet';
  if (phase.includes('Waxing')) return 'building one honest step at a time';
  if (phase.includes('Full')) return 'letting the truth be visible without dramatizing it';
  if (phase.includes('Waning')) return 'editing, releasing, and returning to what matters';
  return 'moving with the sky instead of against it';
}
