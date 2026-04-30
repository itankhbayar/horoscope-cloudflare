import type { ZodiacSign } from './zodiac';
import type { Lang } from './lang';

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
  'The universe rewards courage; step beyond your comfort zone.',
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
}

export function generateDailyHoroscope(
  sign: ZodiacSign,
  dateISO: string,
  lang: Lang,
): DailyHoroscopeContent {
  const bundle = BUNDLES[lang] ?? BUNDLES.en;
  const data = bundle.perSign[sign];
  const seed = seedFromSignAndDate(sign, dateISO);
  return {
    overall: pick(data.overall, seed),
    love: pick(data.love, seed >> 2),
    career: pick(data.career, seed >> 4),
    health: pick(data.health, seed >> 6),
    luckyNumber: (seed % 99) + 1,
    luckyColor: pick(bundle.colors, seed >> 8),
  };
}
