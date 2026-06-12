import type { ZodiacSign } from './zodiac';
import { getZodiacInfo } from './zodiac';
import type { Lang } from './lang';
import { buildDailyHook, type HookTheme } from './dailyHook';
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
  'Momentum is on your side—start before you feel completely ready.',
  'Courage today is quiet: one honest move matters more than ten loud ones.',
  'Your energy is contagious; aim it at what actually deserves the heat.',
];
const EARTH_OVERALL_EN = [
  'Stability and structure favor you today; build for tomorrow.',
  'Patience and persistence open the door to lasting reward.',
  'The cosmos supports careful planning; lay strong foundations.',
  'Grounded confidence carries you through any challenge.',
  'Small, consistent effort compounds into something solid today.',
  'Tend to what is already yours before reaching for more.',
  'Slow is not behind; steady hands finish what restless ones drop.',
];
const AIR_OVERALL_EN = [
  'Ideas flow freely today; share them with someone who listens.',
  'A breath of new perspective changes your outlook entirely.',
  'Curiosity is your guide—follow it where it leads.',
  'Communication unlocks doors that strength alone could not open.',
  'A single clear question cuts through the noise faster than any plan.',
  'Say the thing plainly; clarity is the kindest move you can make today.',
  'Let curiosity, not pressure, set the direction of your day.',
];
const WATER_OVERALL_EN = [
  'Your intuition runs deep today; trust the feelings rising within.',
  'Emotions reveal a truth you have been avoiding; let it surface.',
  'A wave of empathy connects you to the people around you.',
  'Dreams carry messages; pay attention to what your heart whispers.',
  'What you feel is information, not weakness—read it before you react.',
  'Give the quiet undercurrent room and it will tell you what it needs.',
  'Tenderness today is strength wearing softer clothes.',
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
  'Хүч чадал тал дээр чинь байна—бэлэн боллоо гэж хүлээлгүй эхэл.',
  'Өнөөдрийн зориг чимээгүй: нэг үнэнч алхам арван чанга үгнээс илүү.',
  'Эрч хүч чинь халдварлана; үнэхээр зохистой зүйл рүүгээ чиглүүл.',
];
const EARTH_OVERALL_MN = [
  'Тогтвортой байдал, бүтэц өнөөдөр таны талд—маргаашийн тулд бүтээ.',
  'Тэвчээр, тууштай байдал удаан хүртэх шагналын хаалгыг нээнэ.',
  'Орчлон болгоомжтой төлөвлөлтийг дэмжиж байна; бат суурийг тавь.',
  'Газраас баттай итгэл чинь ямар ч сорилтыг даван туулна.',
  'Жижиг ч тогтмол хүчин чармайлт өнөөдөр бат бөх үр дүн болж хуримтлагдана.',
  'Шинийг хайхаасаа өмнө одоо байгаа зүйлээ нягтал.',
  'Удаан нь хоцрогдол биш; тогтвортой гар эхлүүлсэн зүйлээ дуусгана.',
];
const AIR_OVERALL_MN = [
  'Санаанууд чөлөөтэй урсаж байна; сонсож чадах хүнтэй хуваалц.',
  'Шинэ өнцгийн салхи таны үзэл бодлыг бүрэн өөрчилнө.',
  'Сониуч зан чинь жолоодогч—түүний хүссэн зам руу яв.',
  'Харилцаа ганц хүч чадлаар нээж чадаагүй хаалгыг нээнэ.',
  'Нэг тодорхой асуулт ямар ч төлөвлөгөөнөөс хурдан замыг цэлмээнэ.',
  'Хэлэх зүйлээ шууд хэл; тодорхой байх нь өнөөдрийн хамгийн эелдэг алхам.',
  'Дарамт биш, сониуч зан өдрийн чиглэлийг тогтоог.',
];
const WATER_OVERALL_MN = [
  'Зөн чинь өнөөдөр гүн ажиллана; дотроос гарч ирэх мэдрэмжид итгэ.',
  'Сэтгэл хөдлөл чинь зайлсхийж байсан үнэнийг гаргана; гарга.',
  'Энэрэн нигүүлсэх давалгаа таныг эргэн тойрны хүмүүстэй холбоно.',
  'Зүүд зурвас дамжуулна; зүрх чинь юу шивнэхийг анхаар.',
  'Мэдрэмж чинь сул тал биш мэдээлэл—хариу үйлдэл хийхээсээ өмнө уншиж ав.',
  'Дотоод нам гүм урсгалд зай өг, тэр чамд юу хэрэгтэйг хэлнэ.',
  'Өнөөдрийн зөөлөн сэтгэл бол зөөлөн хувцас өмссөн хүч чадал.',
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

/**
 * Deterministic seed for template-variant selection.
 *
 * `identity` is an optional stable per-user token (e.g. users.id). When omitted or empty the seed
 * is byte-identical to the historical sign+date seed, so the SHARED, edge-cached guest reading and
 * the persisted `dailyHoroscopes` row are completely unchanged. When an identity is supplied (only
 * on the authenticated, `private, no-store` path) two same-sign users deterministically diverge in
 * which sentence variants are chosen — no randomness, no extra calls, fully reproducible.
 */
function seedFromSignAndDate(sign: ZodiacSign, dateISO: string, identity = ''): number {
  let h = 0;
  const base = `${sign}-${dateISO}`;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  const sharedSeed = Math.abs(h);
  // No identity → return the exact historical sign+date seed, keeping the shared/guest reading and
  // the persisted row byte-identical.
  if (!identity) return sharedSeed;
  // Identity present: fold it in with an FNV-1a pass plus an avalanche finalizer so that even
  // near-sequential ids (e.g. consecutive UUIDs) spread across all bits. Without this, small pools
  // (`seed % 3`) collide for similar ids and the per-user variation is barely visible. Pure integer
  // math → deterministic, reproducible, no randomness.
  let g = (sharedSeed ^ 0x9e3779b9) | 0;
  for (let i = 0; i < identity.length; i++) {
    g = Math.imul(g ^ identity.charCodeAt(i), 0x01000193);
  }
  g ^= g >>> 15;
  g = Math.imul(g, 0x2c1b3c6d);
  g ^= g >>> 12;
  g = Math.imul(g, 0x297a2d39);
  g ^= g >>> 15;
  return Math.abs(g | 0);
}

export interface DailyHoroscopeContent {
  overall: string;
  love: string;
  career: string;
  health: string;
  finance?: string;
  advice?: string;
  luckyNumber: number;
  luckyColor: string;
  /** The daily emotional-jolt opening line; also prepended into `overall`. */
  hook?: string;
  /** Deterministic theme behind today's hook; consumed by Premium Pattern Memory. */
  hookTheme?: HookTheme;
  skyContext?: DailySkyContext;
  blocks?: HoroscopeContentBlock[];
}

export interface HoroscopeContentBlock {
  id: 'overall' | 'love' | 'career' | 'health' | 'finance' | 'advice' | 'lucky';
  title: string;
  paragraphs: string[];
  emphasis?: string;
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

function debugContentShape(label: string, payload: DailyHoroscopeContent, meta: Record<string, unknown> = {}): void {
  // Temporary runtime diagnostics for MN depth investigation.
  // eslint-disable-next-line no-console
  console.log(`[horoscope-template-${label}]`, {
    ...meta,
    keys: Object.keys(payload),
    hasBlocks: Array.isArray(payload.blocks),
    blockCount: Array.isArray(payload.blocks) ? payload.blocks.length : 0,
    financeLength: typeof payload.finance === 'string' ? payload.finance.length : 0,
    adviceLength: typeof payload.advice === 'string' ? payload.advice.length : 0,
  });
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
  let content: DailyHoroscopeContent;
  if (!options.sky) content = fallback;
  else if (lang === 'en') content = buildAstronomyAwareReadingEn(sign, dateISO, fallback, options);
  else if (lang === 'mn') content = buildAstronomyAwareReadingMn(sign, dateISO, fallback, options);
  else content = fallback;
  return withDailyHook(applyPeriodAwareFrame(content, lang, dateISO, seed), sign, dateISO, lang, options.sky);
}

/**
 * Prepends the deterministic daily emotional jolt as the opening line and exposes
 * it as `hook`. Applied as the final step for every reading (free and premium,
 * EN and MN) so the opening always feels personal and the push can tease the same
 * theme. Runs after period framing so weekly/monthly anchors keep their hook too.
 */
function withDailyHook(
  content: DailyHoroscopeContent,
  sign: ZodiacSign,
  dateISO: string,
  lang: Lang,
  sky?: DailySkySnapshot,
): DailyHoroscopeContent {
  const moon = sky?.planets.find((p) => p.name === 'Moon');
  const { theme, jolt } = buildDailyHook({
    sign,
    dateISO,
    lang,
    moonSign: moon?.sign,
    moonPhase: sky?.moonPhase.name,
  });
  const overall = content.overall ? `${jolt}\n\n${content.overall}` : jolt;
  const blocks = Array.isArray(content.blocks)
    ? content.blocks.map((b) => (b.id === 'overall' ? { ...b, paragraphs: [jolt, ...b.paragraphs] } : b))
    : content.blocks;
  return { ...content, hook: jolt, hookTheme: theme, overall, blocks };
}

export function enrichDailyHoroscope(
  content: DailyHoroscopeContent,
  sign: ZodiacSign,
  dateISO: string,
  lang: Lang,
  options: DailyHoroscopeGenerationOptions,
  identity = '',
): DailyHoroscopeContent {
  debugContentShape('enrich-input', content, { sign, dateISO, lang, hasSky: !!options.sky });
  const seed = seedFromSignAndDate(sign, dateISO, identity);
  // Preserve the stored narrative verbatim. For real rows this is the Claude-written
  // reading; regenerating overall/love/career/health from the small template pools here is
  // exactly what made signed-in readings recur (identical day-to-day and across same-sign
  // users). We now only layer additive sky metadata + the daily hook on top — the four
  // narrative fields are never rewritten on the read/personalize path.
  let next = content;
  if (options.sky) {
    const sun = options.sky.planets.find((p) => p.name === 'Sun');
    const moon = options.sky.planets.find((p) => p.name === 'Moon');
    if (sun && moon) {
      const focusTransit = selectFocusTransit(options.transitAspects ?? []);
      next = {
        ...content,
        skyContext: buildSkyContext(sun.sign, moon.sign, options.sky.moonPhase.name, focusTransit),
      };
    }
  }
  const framed = withDailyHook(applyPeriodAwareFrame(next, lang, dateISO, seed), sign, dateISO, lang, options.sky);
  debugContentShape('enrich-return', framed, { sign, dateISO, lang });
  return framed;
}

function buildAstronomyAwareReadingEn(
  sign: ZodiacSign,
  dateISO: string,
  base: DailyHoroscopeContent,
  options: DailyHoroscopeGenerationOptions,
  identity = '',
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
  const seed = seedFromSignAndDate(sign, dateISO, identity);
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

const MN_SIGN_NAMES: Record<ZodiacSign, string> = {
  aries: 'Хонь',
  taurus: 'Үхэр',
  gemini: 'Ихэр',
  cancer: 'Мэлхий',
  leo: 'Арслан',
  virgo: 'Охин',
  libra: 'Жинлүүр',
  scorpio: 'Хилэнц',
  sagittarius: 'Нум',
  capricorn: 'Матар',
  aquarius: 'Хумх',
  pisces: 'Загас',
};

function buildAstronomyAwareReadingMn(
  sign: ZodiacSign,
  dateISO: string,
  base: DailyHoroscopeContent,
  options: DailyHoroscopeGenerationOptions,
  identity = '',
): DailyHoroscopeContent {
  const sky = options.sky;
  if (!sky) {
    debugContentShape('mn-build-return-base-no-sky', base, { sign, dateISO });
    return base;
  }
  const sun = sky.planets.find((p) => p.name === 'Sun');
  const moon = sky.planets.find((p) => p.name === 'Moon');
  const mercury = sky.planets.find((p) => p.name === 'Mercury');
  const venus = sky.planets.find((p) => p.name === 'Venus');
  if (!sun || !moon) {
    debugContentShape('mn-build-return-base-missing-sun-moon', base, {
      sign,
      dateISO,
      hasSun: !!sun,
      hasMoon: !!moon,
      planetNames: sky.planets.map((p) => p.name),
    });
    return base;
  }

  const seed = seedFromSignAndDate(sign, dateISO, identity);
  const skySeed = seedFromSkyState(sky);
  const dynamicSeed = seed ^ skySeed;
  const focusTransit = selectFocusTransit(options.transitAspects ?? []);
  const moonHouse = options.natalChart ? findNatalHouse(moon.longitude, options.natalChart.houses) : undefined;
  const socialHouse = focusTransit?.natalHouse ?? moonHouse;
  const majorAspect = selectMajorSkyAspect(sky.planets);

  const moonPhase = mnMoonPhaseLabel(sky.moonPhase.name);
  const transitLine = focusTransit
    ? mnTransitMeaning(focusTransit, socialHouse, dynamicSeed >> 2)
    : pick([
      'Төрөх зурагтай хүчтэй шүргэлцэх дохио цөөн өдөр тул өөрийнхөө хэмнэлийг барих нь хамгийн том давуу тал болно.',
      'Өнөөдөр тэнгэр тайван талдаа тул бусдын шахалтаар бус өөрийн бодсон дарааллаар явбал илүү амар.',
      'Хэт огцом эргэлтгүй өдөр: жижиг шийдвэрүүдээ нягт хийвэл орой илүү хөнгөн мэдрэгдэнэ.',
    ], dynamicSeed >> 2);
  const aspectLine = majorAspect
    ? mnMajorAspectMeaning(majorAspect, dynamicSeed >> 3)
    : pick([
      'Өнөөдөр хурц мөргөлдөөн багатай тул яарах биш, цэгцтэй байх нь танд илүү ажиллана.',
      'Том савлагаа бага өдөр: зөв хуваарилсан эрч хүч илүү тогтвортой үр дүн өгнө.',
      'Тэнгэр зөөлөн учраас жижиг дохио, жижиг сонголт тань өдөр бүхнийг чиглүүлнэ.',
    ], dynamicSeed >> 3);

  const financeCue = mnFinanceCue(sun.sign, moon.sign, dynamicSeed >> 4);
  const adviceCue = mnAdviceCue(moon.sign, dynamicSeed >> 5);
  const colorCue = mnLuckyColorCue(base.luckyColor, sun.sign, dynamicSeed >> 6);
  const relationHouseCue = socialHouse ? `Энэ дохио ${mnHouseCue(socialHouse)} дээр илүү тод мэдрэгдэнэ.` : '';
  const emotionalFocus = mnMoonExperience(moon.sign, dynamicSeed >> 11);
  const connectionFocus = mnVenusExperience(venus?.sign ?? moon.sign, dynamicSeed >> 12);
  const communicationFocus = mnMercuryExperience(mercury?.sign ?? sun.sign, dynamicSeed >> 13);
  const workFocus = mnSunWorkExperience(sun.sign, dynamicSeed >> 14);
  const natalLead = options.natalChart
    ? pick([
      'Таны суурь зан төлөвтэй өнөөдрийн хэмнэл огтлолцож байгаа тул дотоод мэдрэмж илүү хурдан хариу өгч магадгүй.',
      'Өмнө нь үл тоосон дотоод дохио өнөөдөр илүү тод сонсогдоно.',
      'Өөрийн хэв маягтайгаа нийцүүлж алхмаа сонговол өдөр илүү зөөлөн урагшилна.',
    ], dynamicSeed >> 1)
    : pick([
      'Өнөөдрийн дотоод хэмнэл нэлээд мэдрэмтгий байна.',
      'Өдөр эхлэхэд дотоод анхаарал нэг гол сэдэв рүү татагдана.',
      'Өнөөдөр хэт их зүйл зэрэг амжуулах гэж яарахгүй байх нь зөв.',
    ], dynamicSeed >> 1);

  const overallParagraphs = mnOverallParagraphs({
    sign,
    moonSign: moon.sign,
    moonPhase: sky.moonPhase.name,
    natalLead,
    emotionalFocus,
    aspectLine,
    transitLine,
    seed: dynamicSeed,
  });
  const loveParagraphs = mnLoveParagraphs({
    moonSign: moon.sign,
    venusSign: venus?.sign ?? moon.sign,
    relationHouseCue,
    connectionFocus,
    seed: dynamicSeed,
  });
  const careerParagraphs = mnCareerParagraphs({
    sunSign: sun.sign,
    mercurySign: mercury?.sign ?? sun.sign,
    workFocus,
    communicationFocus,
    financeCue,
    seed: dynamicSeed,
  });
  const healthParagraphs = mnHealthParagraphs({
    moonSign: moon.sign,
    moonPhase: sky.moonPhase.name,
    adviceCue,
    colorCue,
    seed: dynamicSeed,
  });
  const financeParagraphs = mnFinanceParagraphs(financeCue, dynamicSeed);
  const adviceParagraphs = mnAdviceParagraphs(adviceCue, dynamicSeed);
  const blocks = mnBuildBlocks(base, {
    overall: overallParagraphs,
    love: loveParagraphs,
    career: careerParagraphs,
    health: healthParagraphs,
    finance: financeParagraphs,
    advice: adviceParagraphs,
  });

  const result = {
    ...base,
    skyContext: buildSkyContext(sun.sign, moon.sign, sky.moonPhase.name, focusTransit),
    overall: overallParagraphs.join('\n\n'),
    love: loveParagraphs.join('\n\n'),
    career: careerParagraphs.join('\n\n'),
    health: healthParagraphs.join('\n\n'),
    finance: financeParagraphs.join('\n\n'),
    advice: adviceParagraphs.join('\n\n'),
    blocks,
  };
  debugContentShape('mn-build-return-rich', result, { sign, dateISO, planetCount: sky.planets.length });
  return result;
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

function parseIsoDate(iso: string): Date | null {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWeeklyAnchorDate(iso: string): boolean {
  const d = parseIsoDate(iso);
  if (!d) return false;
  return d.getUTCDay() === 1;
}

function isMonthlyAnchorDate(iso: string): boolean {
  const d = parseIsoDate(iso);
  if (!d) return false;
  return d.getUTCDate() === 1;
}

function applyPeriodAwareFrame(content: DailyHoroscopeContent, lang: Lang, dateISO: string, seed: number): DailyHoroscopeContent {
  if (isMonthlyAnchorDate(dateISO)) return monthlyFrame(content, lang, seed);
  if (isWeeklyAnchorDate(dateISO)) return weeklyFrame(content, lang, seed);
  return content;
}

function weeklyFrame(content: DailyHoroscopeContent, lang: Lang, seed: number): DailyHoroscopeContent {
  if (lang === 'mn') {
    return {
      ...content,
      overall: `Энэ долоо хоногт гол нь хэмнэлээ зөв барих. ${pick([
        'Эхний өдрүүдэд чиглэлээ тодруулж, дунд үедээ ачааллаа тэнцвэржүүл, сүүл рүүгээ дуусаагүй ажлаа цэгцэл.',
        'Долоо хоногийн эхэнд эхлүүлсэн жижиг сахилга сарын зорилгод шууд нөлөөлнө. Нэг дор олон зүйл биш, хоёр чухал зүйлээ хамгаал.',
        'Энэ долоо хоногт хурд бус дараалал ялна: эхлэлээ тайван тавьж, дунд үедээ засвар хийж, төгсгөлд нь үр дүнгээ баталгаажуул.',
      ], seed >> 7)} ${extractCoreWeeklySignal(content.overall)}`,
      love: `Харилцаанд энэ долоо хоногт тогтвортой анхаарал чухал. ${extractCoreWeeklySignal(content.love)}`,
      career: `Ажил дээр энэ долоо хоногт шийдвэрээ үе шаттай гарга. ${extractCoreWeeklySignal(content.career)}`,
      health: `Бие, сэтгэлийн хувьд энэ долоо хоногт давтагдах энгийн дэг хамгийн үр дүнтэй. ${extractCoreWeeklySignal(content.health)}`,
    };
  }
  return {
    ...content,
    overall: `Weekly outlook: ${content.overall}`,
    love: `Relationship focus this week: ${content.love}`,
    career: `Career direction this week: ${content.career}`,
    health: `Weekly wellbeing rhythm: ${content.health}`,
  };
}

function monthlyFrame(content: DailyHoroscopeContent, lang: Lang, seed: number): DailyHoroscopeContent {
  if (lang === 'mn') {
    return {
      ...content,
      overall: `Энэ сарын зураг урт амьсгал шаардсан үе байна. ${pick([
        'Сарын эхэнд тавьсан зарчим тань дунд үед соригдож, сүүл рүүгээ үр дүн нь тодорно.',
        'Энэ сар "их зүйл эхлүүлэх" сар биш, харин зөв зүйлээ тууштай барих сар болно.',
        'Сарын турш ачааллаа шаталж зохицуулбал сүүл үедээ ядаргаагүй ч ахицтай үлдэнэ.',
      ], seed >> 8)} ${extractCoreMonthlySignal(content.overall)}`,
      love: `Энэ сарын харилцааны гол сэдэв нь итгэл ба тогтвортой анхаарал. ${extractCoreMonthlySignal(content.love)}`,
      career: `Энэ сард карьер, санхүүд хурдан үсрэлтээс илүү тогтвортой алхам ашигтай. ${extractCoreMonthlySignal(content.career)}`,
      health: `Энэ сард бие, сэтгэлд урт хугацаанд даах дэглэм сонго. ${extractCoreMonthlySignal(content.health)}`,
    };
  }
  return {
    ...content,
    overall: `Monthly outlook: ${content.overall}`,
    love: `Relationship theme this month: ${content.love}`,
    career: `Career and money theme this month: ${content.career}`,
    health: `Monthly wellbeing cadence: ${content.health}`,
  };
}

function mnSignName(sign: ZodiacSign): string {
  return MN_SIGN_NAMES[sign];
}

function mnMoonPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    'New Moon': 'шин сарны',
    'Waxing Crescent': 'саравчлан дүүрэх',
    'First Quarter': 'тал сарны',
    'Waxing Gibbous': 'бараг дүүрэх',
    'Full Moon': 'тэргэл сарны',
    'Waning Gibbous': 'дүүрснээс буурах',
    'Last Quarter': 'хорогдох тал сарны',
    'Waning Crescent': 'битүүрэхийн өмнөх',
  };
  return labels[phase] ?? phase;
}

function seedFromSkyState(sky: DailySkySnapshot): number {
  const sig = `${sky.date}:${sky.moonPhase.name}:${sky.planets.map((p) => `${p.name}-${p.sign}`).join('|')}`;
  let h = 0;
  for (let i = 0; i < sig.length; i += 1) h = (h * 33 + sig.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mnMajorAspectMeaning(aspect: Aspect, seed: number): string {
  const type = aspect.type;
  if (type === 'conjunction') {
    return pick([
      'Өнөөдрийн тэнгэр нэг чиг рүү хүч төвлөрүүлж байна. Тарамдсан ажлаа нэг цэгт аваачвал хамгийн хурдан ахина.',
      'Энерги нэг сувгаар хүчтэй урсаж байгаа өдөр. Нэг шийдвэр дээр төвлөрвөл эргэлзээ багасна.',
    ], seed);
  }
  if (type === 'opposition') {
    return pick([
      'Тэнгэр хоёр талын хэрэгцээг зэрэг мэдрүүлж байна. "Нэгийг нь сонгох" биш, тэнцвэрийн шинэ дүрэм гаргах өдөр.',
      'Дотоод ба гадаад шахалт зэрэг ирж болно. Шууд эсэргүүцэхээс илүү хэлэлцэх байрлалд орвол ашигтай.',
    ], seed);
  }
  if (type === 'square') {
    return pick([
      'Тэнгэр багахан шахалт өгч байгаа тул асуудлыг тойрох биш, төвөөс нь барьж шийдэх хэрэгтэй.',
      'Эсэргүүцэл мэдрэгдэх өдөр ч зөв дараалал баримталбал энэ даралт ахиц болж хувирна.',
    ], seed);
  }
  if (type === 'trine') {
    return pick([
      'Тэнгэрийн урсгал дэмжиж байгаа өдөр. Амархан бүтэж буй ажлаа ашиглаж нөөц хүчээ хуримтлуул.',
      'Зөөлөн дэмжлэг мэдрэгдэх тул сайн явж буй чиглэлээ улам бататгахад тохиромжтой.',
    ], seed);
  }
  return pick([
    'Өнөөдөр боломж нээгдэх цонх гарч байна. Жижигхэн санаачилга их хаалга нээж чадна.',
    'Эвтэй урсгалтай өдөр тул нэг алхам урагшлахад хэт их хүч шаардахгүй.',
  ], seed);
}

function mnTransitMeaning(focusTransit: TransitToNatalAspect, house: number | undefined, seed: number): string {
  const body = focusTransit.transitBody;
  const natalBody = focusTransit.natalBody;
  const type = focusTransit.type;
  const houseCue = house ? `Нөлөө нь ${mnHouseCue(house)} дээр илүү тод мэдрэгдэнэ.` : '';
  if (body === 'Moon' || natalBody === 'Moon') {
    return pick([
      `Өнөөдрийн сэдэв сэтгэлээ яаж удирдах вэ гэдэгт төвлөрнө. ${houseCue}`,
      `Сэтгэл хөдлөл хурдан солигдож мэдэх өдөр тул хариу өгөхөөсөө өмнө зай авч бодоорой. ${houseCue}`,
    ], seed);
  }
  if (body === 'Mercury' || natalBody === 'Mercury') {
    return pick([
      `Яриа, тохиролцоо, бичиг баримтын сэдэвт анхаарал өндөр байна. Үг сонголтоо энгийн байлгах тусам ашигтай. ${houseCue}`,
      `Буруу ойлголцлоос сэргийлэх өдөр: товч, тод хэллэг таны хамгийн том хамгаалалт болно. ${houseCue}`,
    ], seed);
  }
  if (body === 'Venus' || natalBody === 'Venus') {
    return pick([
      `Харилцаа ба үнэ цэнийн сэдэв идэвхтэй. Халамжийг бодит үйлдлээр үзүүлэхэд холбоо чангарна. ${houseCue}`,
      `Эв найрамдлын суваг нээгдэж байна. Эелдэг, үнэн харилцаа өнөөдөр илүү хүчтэй нөлөөтэй. ${houseCue}`,
    ], seed);
  }
  if (type === 'square' || type === 'opposition') {
    return pick([
      `Өнөөдөр дотоод эсэргүүцэл мэдрэгдэж болох ч түүнээ нэрлэж чадвал дараагийн алхам тод болно. ${houseCue}`,
      `Хөндлөн даралт байгаа өдөр тул бүхнийг зэрэг шийдэхгүй, нэг гол зангилааг л тайлаарай. ${houseCue}`,
    ], seed);
  }
  return pick([
    `Төрөх зурхайтай зөөлөн дэмжлэгтэй өдрүүдийн нэг. Жижиг хөдөлгөөнөө тогтвортой үргэлжлүүлэхэд хангалттай. ${houseCue}`,
    `Өнөөдрийн нөлөө танд чиглэлээ зөв барихад тусална. Хэт яарахгүй, гэхдээ буцахгүй урагшил. ${houseCue}`,
  ], seed);
}

function extractCoreWeeklySignal(text: string): string {
  if (text.includes('.')) return `${text.split('.')[0]!.trim()}.`;
  return text;
}

function extractCoreMonthlySignal(text: string): string {
  if (text.includes('.')) return `${text.split('.')[0]!.trim()}.`;
  return text;
}

function mnOverallOpening(natalLead: string, moonPhase: string, emotionalFocus: string, seed: number): string {
  return pick([
    `${natalLead} ${moonPhase} үеийн хэмнэлтэй давхацсанаар сэтгэлийн нарийн дохио илүү хүчтэй мэдрэгдэнэ. ${emotionalFocus}`,
    `Өнөөдөр ${moonPhase} үеэр дотоод хариу үйлдэл хурдан болох хандлагатай. ${natalLead} ${emotionalFocus}`,
    `${natalLead} Өнөөдөр сэтгэлээ хүчээр дарж явахаас илүү зөв нэрлэж таних нь өдөр бүхнийг хөнгөвчилнө. ${emotionalFocus}`,
  ], seed);
}

function mnLoveOpening(seed: number): string {
  return pick([
    'Харилцаанд жижиг өнгө аяс ч тод анзаарагдаж магадгүй өдөр.',
    'Өнөөдөр дотно холбоонд хүлээлт ба бодит үйлдлийн зөрүү амархан мэдрэгдэнэ.',
    'Хайрын харилцаанд илэн далангүй байдал богино хугацаанд илүү үр дүн өгнө.',
  ], seed);
}

function mnCareerOpening(seed: number): string {
  return pick([
    'Ажил дээр тогтсон чиглэлтэй, шат дараатай ажил илүү үр дүнтэй явна.',
    'Өнөөдөр олон зүйл зэрэг эхлүүлэхээс илүү нэг гол шийдвэрээ дуусгах нь зөв.',
    'Ажлын орчинд хурд бус цэгцтэй дараалал ахиц илүү тодруулна.',
  ], seed);
}

function mnMoonExperience(sign: ZodiacSign, seed: number): string {
  switch (sign) {
    case 'cancer':
      return pick([
        'Гэр бүл, дотны хүмүүсийн асуудал анхаарлын төвд орж магадгүй.',
        'Аюулгүй, дулаан орчин хэрэгтэй мэдрэмж илүү тод мэдэгдэнэ.',
      ], seed);
    case 'libra':
      return pick([
        'Хоёр талын хэрэгцээг тэнцвэртэй харах шаардлага нэмэгдэнэ.',
        'Харилцаанд шударга тэнцвэрийг хадгалах нь сэтгэл амраана.',
      ], seed);
    case 'scorpio':
      return pick([
        'Мэдрэмж гүнзгийрч, дотоод эргэцүүлэл хүчтэй явагдаж магадгүй.',
        'Гаднаа тайван харагдавч дотроо илүү гүн асуулттай үлдэж болно.',
      ], seed);
    default: {
      const el = getZodiacInfo(sign).element;
      if (el === 'fire') return pick(['Шуурхай хариулах хүсэл нэмэгдэх ч түр азнах нь илүү ухаалаг.', 'Сэтгэлийн импульс хурдан өсөх тул анхны хариугаа багахан удаашруул.'], seed);
      if (el === 'earth') return pick(['Тодорхой, баригдах зүйл хүсэх мэдрэмж нэмэгдэнэ.', 'Тогтвортой дэглэмд буцах хүсэл сэтгэлийг тайвшруулна.'], seed);
      if (el === 'air') return pick(['Бодол ихсэх хандлагатай тул мэдрэмжээ товч нэрлэж тэмдэглээрэй.', 'Мэдрэмжээ хэт задлан шинжлэхээс илүү гол цөмийг нь барих нь зөв.'], seed);
      return pick(['Эмзэг мэдрэмж илүү ойрхон мэдрэгдэнэ.', 'Дотоод дохио илүү хурдан мэдрэгдэж магадгүй тул өөртөө зай гаргаарай.'], seed);
    }
  }
}

function mnVenusExperience(sign: ZodiacSign, seed: number): string {
  const el = getZodiacInfo(sign).element;
  if (el === 'fire') {
    return pick([
      'Дотно байдалд татагдалт хурдан асах тул өнгө аясаа зөөлөн хадгалах нь чухал.',
      'Сэтгэл татах хүч өндөр байгаа өдөр тул эелдэг илэрхийлэл харилцааг илүү удаан тогтооно.',
    ], seed);
  }
  if (el === 'earth') {
    return pick([
      'Анхаарал, халамжийг бодит үйлдлээр харуулахад итгэл хурдан өснө.',
      'Үгнээс илүү тогтвортой үйлдэл харилцаанд үнэ цэн нэмнэ.',
    ], seed);
  }
  if (el === 'air') {
    return pick([
      'Харилцаанд сонсох чадвар, ойлгомжтой ярилцах орчин илүү чухалдана.',
      'Нээлттэй ярилцлага татагдлыг зөв чиглэлд барьж өгнө.',
    ], seed);
  }
  return pick([
    'Эмзэг сэдэвт зөөлөн хандах тусам холбоо гүнзгийрнэ.',
    'Хайр халамжийг ил тод илэрхийлэх нь өнөөдөр илүү сайн хүрнэ.',
  ], seed);
}

function mnMercuryExperience(sign: ZodiacSign, seed: number): string {
  const el = getZodiacInfo(sign).element;
  if (el === 'fire') return pick(['Хэлэлцээ хурдан эргэх хандлагатай тул гол санаагаа товч бариарай.', 'Түргэн шийдэх яриа ихсэж болох тул баримтаа урьдчилж бэлдэх нь тустай.'], seed);
  if (el === 'earth') return pick(['Төлөвлөлт, хугацаа, хариуцлагаа тод болгох нь үл ойлголцлыг бууруулна.', 'Тодорхой төлөвлөгөөтэй ярилцлага хамгийн үр дүнтэй явна.'], seed);
  if (el === 'air') return pick(['Олон мэдээллээс гол цөмийг ялгаж хэлбэл хүмүүс хурдан ойлгоно.', 'Хэлэлцээ, төлөвлөлт, тохиролцоо хийхэд өнөөдөр боломж сайн.'], seed);
  return pick(['Ярианы цаадах сэтгэлзүйн өнгө анзаарагдах тул үгээ зөөлөн сонгоорой.', 'Эмпати шингэсэн тайлбар хэлэлцээг илүү бүтээлч болгоно.'], seed);
}

function mnSunWorkExperience(sign: ZodiacSign, seed: number): string {
  const el = getZodiacInfo(sign).element;
  if (el === 'fire') return pick(['Идэвхтэй эхлүүлэх эрч сайн байгаа ч хэт тарамдахгүй байх нь чухал.', 'Шийдэмгий алхам хэрэгтэй ч нэг гол зорилтоо л хамгаал.'], seed);
  if (el === 'earth') return pick(['Тогтвортой ахиц шаардсан ажлууд өнөөдөр илүү үр дүнтэй байна.', 'Суурь бэхжүүлэх ажилд цаг өгөх тусам өгөөж өндөр гарна.'], seed);
  if (el === 'air') return pick(['Санаагаа нэгтгэж, бүтэцжүүлэх ажил өнөөдөр амархан урагшилна.', 'Тайлбар, зохион байгуулалт шаардсан ажилд анхаарал сайн төвлөрнө.'], seed);
  return pick(['Багийн уур амьсгал, хамтын ажиллагаанд мэдрэмжтэй хандвал үр дүн сайжирна.', 'Хүмүүстэй уялдах ажлууд дээр уян хатан байдал тань давуу тал болно.'], seed);
}

function mnOverallParagraphs(input: {
  sign: ZodiacSign;
  moonSign: ZodiacSign;
  moonPhase: string;
  natalLead: string;
  emotionalFocus: string;
  aspectLine: string;
  transitLine: string;
  seed: number;
}): string[] {
  return [
    `${mnOverallOpening(input.natalLead, mnMoonPhaseLabel(input.moonPhase), input.emotionalFocus, input.seed)} ${mnOverallCue(input.sign, input.moonSign, input.seed)}`,
    `${pick([
      'Өнөөдрийн боломж нь анхаарлаа тарамдуулахгүйгээр нэг гол сэдвээ гүнзгийрүүлэхэд байна.',
      'Та зөв хэмнэлээ олж чадвал жижиг шийдвэрүүд хуримтлагдаж том ахиц болж хувирна.',
      'Өдөр дундаас хойш илүү тодорхой байдал мэдрэгдэх тул чухал яриа, шийдвэрээ тэр цагт төвлөрүүлээрэй.',
    ], input.seed >> 21)} ${input.aspectLine}`,
    `${pick([
      'Анзаарах эрсдэл нь: бусдын яаралтай мэдрэмжийг өөрийн зорилготой андуурах.',
      'Анзаарах эрсдэл нь: сэтгэлээ дотроо барьсаар бодит хэрэгцээгээ хойшлуулах.',
      'Анзаарах эрсдэл нь: хэт их тайлбарлаж шийдвэрийн мөчийг алдах.',
    ], input.seed >> 22)} ${input.transitLine}`,
    pick([
      'Сэтгэлзүйн уур амьсгалын хувьд өнөөдөр хамгаалах хариу үйлдэл хурдан гарч магадгүй ч та үүнийг анзаараад удаашруулж чадвал шийдвэрийн чанар мэдэгдэхүйц сайжирна. Хэн нэгний өнгө аяс таны дотоод мэдрэмжийг өдөөснөөр бүхэл өдрийн утга өөрчлөгдөх тул анхны сэтгэгдлээ шууд үнэн гэж батлахгүй байх нь зөв.',
      'Өнөөдрийн дотоод цаг агаар нь нэг мөчид тайван, нөгөө мөчид эмзэг болж савлах шинжтэй. Ийм үед өөрийгөө буруутгахын оронд "би яг одоо юу мэдэрч байна, надад яг юу хэрэгтэй байна" гэдгээ товч нэрлэх арга хамгийн их тус болдог.',
      'Өнөөдөр таны хувьд хамгийн том үнэ цэнэ нь гаднах хурдаа бус дотоод тогтвортой байдлаа хадгалах явдал. Хэрэв нэг яриа эсвэл нэг мэдээ таныг сэтгэлээр хүчтэй хөдөлгөвөл тухайн мөчийг асуудал биш мэдээлэл гэж харж чадвал өдөр илүү удирдлагатай болно.',
    ], input.seed >> 34),
    pick([
      'Практик зөвлөмж: өнөөдрийн төгсгөлд гурван зүйлээ тэмдэглэ - юу мэдэрсэн, юу ойлгосон, маргааш юу үргэлжлүүлэхээ.',
      'Практик зөвлөмж: өөрийгөө шахахаас илүү ажлын дарааллаa цэгцлэхэд 15 минут зарцуулаарай.',
      'Практик зөвлөмж: нэг чухал шийдвэрийнхээ өмнө богино завсарлага авч, хариу үйлдэл биш сонголтоо хий.',
    ], input.seed >> 23),
  ];
}

function mnLoveParagraphs(input: {
  moonSign: ZodiacSign;
  venusSign: ZodiacSign;
  relationHouseCue: string;
  connectionFocus: string;
  seed: number;
}): string[] {
  return [
    `${mnLoveOpening(input.seed)} ${mnLoveCue(input.moonSign, input.venusSign, input.seed)}`,
    `${pick([
      'Харилцааны динамик дээр өнөөдөр хэлээгүй зүйлс хүртэл мэдрэгдэж магадгүй.',
      'Хосын хооронд жижиг хандлага том утга агуулж байгаа мэт санагдаж болно.',
      'Хүлээлт, бодит байдал зөрөх мөч гарвал хамгаалах биш тайлбарлах хандлага илүү үр дүнтэй.',
    ], input.seed >> 24)} ${input.connectionFocus}`,
    `${pick([
      'Ганц бие хүмүүсийн хувьд: танилцахдаа төгс харагдах гэж оролдохоос илүү үнэн өнгөөрөө байх нь илүү татна.',
      'Ганц бие хүмүүсийн хувьд: сонирхол төрсөн хүнтэйгээ хурдлахгүй, тогтвортой харилцааны өнгө барь.',
      'Ганц бие хүмүүсийн хувьд: эхний ярианд өөрийн хил хязгаарыг зөөлөн тодорхой хэлэх нь итгэл төрүүлнэ.',
    ], input.seed >> 25)} ${pick([
      'Хостой хүмүүсийн хувьд: "чи яагаад" гэж эхлэхийн оронд "би ингэж мэдэрлээ" гэж эхлэх нь ойртуулна.',
      'Хостой хүмүүсийн хувьд: шийдэхийн өмнө сонсох 10 минут харилцааны уур амьсгалыг өөрчилнө.',
      'Хостой хүмүүсийн хувьд: өнөөдөр том яриаг жижиг, ойлгомжтой хэсэгт хувааж ярилц.',
    ], input.seed >> 26)}`,
    pick([
      'Хайрын талбарт өнөөдөр хэн зөв, хэн буруу гэдгээс илүү хэн нь илүү үнэн, илүү ойлгомжтой байж чадсан нь чухал өдөр. Та хэт таамаглаж дотроо дүгнэхээсээ өмнө нэг тодруулга асуух нь үл ойлголцлын мөчлөгийг шууд тасалж чадна.',
      'Харилцаанд өнөөдөр "намайг ойлгооч" гэх дуу хоолой дотроос хүчтэй сонсогдож магадгүй. Үүнийг гомдол хэлбэрээр гаргахын оронд хэрэгцээгээ энгийн хэлбэрээр нэрлэвэл хариу илүү хурдан, илүү зөөлөн ирнэ.',
      'Хайрын эрчим өнөөдөр жижиг зүйлээс том мэдрэмж рүү хурдан өсөх хандлагатай. Ийм үед өнгөрсөн асуудлыг давтан сөхөхөөс илүү яг өнөөдрийн бодит хэрэгцээндээ төвлөрөх нь харилцааг хамгаална.',
    ], input.seed >> 35),
    `${input.relationHouseCue} ${pick(['Таамаглахаас илүү тод асуух нь ойртуулна.', 'Сэтгэлээ зөв таахыг хүлээхээс илүү тайван хэлэх нь илүү үр дүнтэй.', 'Хэт тайлбарлахын оронд гол мэдрэмжээ нэг өгүүлбэрээр хэлээрэй.'], input.seed >> 27)}`,
  ];
}

function mnCareerParagraphs(input: {
  sunSign: ZodiacSign;
  mercurySign: ZodiacSign;
  workFocus: string;
  communicationFocus: string;
  financeCue: string;
  seed: number;
}): string[] {
  return [
    `${mnCareerOpening(input.seed)} ${mnCareerCue(input.sunSign, input.mercurySign, input.seed)}`,
    `${input.workFocus} ${pick([
      'Өнөөдрийн шийдвэр гаргалтад "яаралтай" ба "чухал"-аа салгаж харах нь үр дүнг өсгөнө.',
      'Өнөөдөр дуусгах чадвар эхлүүлэхээс илүү үнэ цэнтэй байх өдөр.',
      'Нэг удаагийн өндөр ачааллаас илүү тогтвортой ахиц таны нэр хүндэд тустай.',
    ], input.seed >> 28)}`,
    `${input.communicationFocus} ${pick([
      'Хамтын ажиллагаанд таны тодорхойлсон дараалал бусдад итгэл өгнө.',
      'Багийн түвшинд үүрэг, хугацаа, хүлээлт гурваа нэг мөр болгож бичээрэй.',
      'Хэлэлцээ хийхдээ эхлээд зорилгоо, дараа нь нөхцлөө, эцэст нь хугацаагаа хэл.',
    ], input.seed >> 29)}`,
    pick([
      'Карьерын орчинд өнөөдөр дуугүй хөдөлмөрийг тань хүмүүс анзаарахгүй өнгөрөх магадлалтай тул хийсэн ажлынхаа хүрээ, үр дүн, дараагийн алхмаа богино хэлбэрээр өөрөө ил тод болгож өгөөрэй. Энэ нь өөрийгөө магтах биш мэргэжлийн тодорхой байдал бий болгох алхам юм.',
      'Өнөөдөр ажлын эрч хурдан солигдох үед жижиг төлөвлөгөө хамгийн сайн хамгаалалт болно: юу заавал дуусгах, юу хойшлуулах, хэнтэй зөвшилцөх гэсэн гурван жагсаалт хийж эхэлбэл стресс буурна.',
      'Ажлын талбар дээр өнөөдөр бусдын яаралтай хүсэлтийг бүгдийг нь өөр дээрээ авах эрсдэлтэй. Таныг өсгөх ажил болон таныг зүгээр л ядраах ажлыг ялгах нэг жижиг шалгуур тавибал урт хугацааны ахицад тустай.',
    ], input.seed >> 36),
    `${pick([
      'Өсөлтийн боломж: хойшлуулж явсан нэг чадвараа өнөөдрөөс жижиг алхмаар эхлүүл.',
      'Өсөлтийн боломж: зөвхөн танд үлдээд байсан ажлын процессыг багтайгаа хуваалцах.',
      'Өсөлтийн боломж: хяналт шаардсан ажлуудаа автоматчлах жижиг шийдэл турших.',
    ], input.seed >> 30)} ${input.financeCue}`,
  ];
}

function mnHealthParagraphs(input: {
  moonSign: ZodiacSign;
  moonPhase: string;
  adviceCue: string;
  colorCue: string;
  seed: number;
}): string[] {
  return [
    mnHealthCue(input.moonSign, input.moonPhase, input.seed),
    pick([
      'Сэтгэлзүйн хувьд: мэдрэмжээ дотроо хадгалах тусам ядралт хурдан нэмэгдэж магадгүй.',
      'Сэтгэлийн хувьд: өнөөдөр мэдрэлийн ачаалал хуримтлагдах хандлагатай тул мэдээллийн урсгалаа багасга.',
      'Сэтгэлзүйн хувьд: богино ч гэсэн чимээгүй хугацаа төвлөрлийг мэдэгдэхүйц сэргээнэ.',
    ], input.seed >> 31),
    pick([
      'Биеийн түвшинд өнөөдөр өндөр ачаалалтай дасгалаас илүү хэмнэлтэй, давтагдах хөдөлгөөн танд илүү тохирно. Нойрны өмнө дэлгэцийн хэрэглээг 30 минут багасгах жижиг өөрчлөлт ч маргаашийн төвлөрөлд мэдэгдэхүйц нөлөөлнө.',
      'Өнөөдрийн сэргэлтийн чанар "их зүйл хийх"-ээс биш, "тасралтгүй жижиг арчилгаа"-аас гарна. Ус, амьсгал, сунгалт, богино алхалт гэсэн дөрвийг өдөртөө тарааж хийвэл ядаргааны түвшин тогтвортой буурна.',
      'Эрүүл мэндийн хувьд өнөөдөр дохиогоо хэтэрхий орой сонсох эрсдэл бий. Толгой манарах, уур савлах, анхаарал сарних зэрэг жижиг шинжүүдийг эрт анзаараад богино завсарлага авах нь өдрийн сүүлийн хэсгийг авардаг.',
    ], input.seed >> 37),
    `${input.adviceCue} ${input.colorCue}`,
  ];
}

function mnFinanceParagraphs(financeCue: string, seed: number): string[] {
  return [
    financeCue,
    pick([
      'Зардлын талд: таашаал авах худалдан авалт ба хэрэгцээний худалдан авалтаа тусад нь тэмдэглэвэл удирдлага сайжирна.',
      'Хадгаламжийн талд: жижиг дүнгээр ч тогтмол хийх хандлага өнөөдрөөс эхэлбэл сарын төгсгөлд өөрчлөлт харагдана.',
      'Эрсдэлийн талд: сэтгэл хөөрөл дээр суурилсан санхүүгийн шийдвэрийг нэг шөнө амрааж байж баталгаажуул.',
    ], seed >> 32),
    pick([
      'Өнөөдрийн санхүүгийн практик алхам: орлого, тогтмол зардал, хувьсах зардлын гурван мөртэй богино хүснэгт гарга. Энэ жижиг зураглал нь шийдвэр бүрийн дарамтыг бууруулж, танд сонголтын эрх мэдэл байгаа мэдрэмжийг буцааж өгдөг.',
      'Мөнгөний асуудалд өнөөдөр хэт өөдрөг эсвэл хэт болгоомжтой хоёр туйл руу савлах боломжтой. Аль алинаас сэргийлэхийн тулд 24 цагийн дүрэм (том худалдан авалтыг маргааш батлах) ба дээд хязгаарын дүрэм (төсөвт дүн тогтоох)-ийг зэрэг хэрэглээрэй.',
      'Санхүүд өнөөдрийн гол зорилго том ашиг биш, хяналт сэргээх явдал байна. Өчигдрийн нэг хэрэггүй зардлаа тодорхойлж, оронд нь юунд зарцуулах байсан бэ гэдгээ тэмдэглэхэд таны мөнгөний шийдвэрийн чанар хурдан сайжирна.',
    ], seed >> 38),
  ];
}

function mnAdviceParagraphs(adviceCue: string, seed: number): string[] {
  return [
    adviceCue,
    pick([
      'Өнөөдрийн нэг санаа: хурднаас илүү хэмнэлээ хамгаал.',
      'Өнөөдрийн нэг санаа: өөрийгөө шахахаас илүү зорилгоо цэгцэл.',
      'Өнөөдрийн нэг санаа: зөв цагт хэлсэн нэг үнэн үг олон тайлбараас хүчтэй.',
    ], seed >> 33),
    pick([
      'Санах өгүүлбэр: өөртөө өгсөн жижиг амлалт ч биелэх тусам таны дотоод итгэлийг хамгийн хурдан нэмдэг.',
      'Санах өгүүлбэр: өнөөдөр төгс хийхээсээ илүү маргааш ч үргэлжлүүлж чадах хэмнэл сонго.',
      'Санах өгүүлбэр: таны тайван байдал бол идэвхгүй байдал биш, энэ бол илүү чанартай шийдвэр гаргах стратеги.',
    ], seed >> 39),
  ];
}

function mnBuildBlocks(
  base: DailyHoroscopeContent,
  sections: { overall: string[]; love: string[]; career: string[]; health: string[]; finance: string[]; advice: string[] },
): HoroscopeContentBlock[] {
  return [
    { id: 'overall', title: 'Ерөнхий', paragraphs: sections.overall, emphasis: 'Өдрийн гол сэдэв' },
    { id: 'love', title: 'Хайр', paragraphs: sections.love, emphasis: 'Харилцааны динамик' },
    { id: 'career', title: 'Ажил', paragraphs: sections.career, emphasis: 'Ажлын энерги' },
    { id: 'health', title: 'Эрүүл мэнд', paragraphs: sections.health, emphasis: 'Сэргэлт ба тэнцвэр' },
    { id: 'finance', title: 'Санхүү', paragraphs: sections.finance, emphasis: 'Зардал ба эрсдэл' },
    { id: 'advice', title: 'Зөвлөгөө', paragraphs: sections.advice, emphasis: 'Өнөөдрийн гол санаа' },
    { id: 'lucky', title: 'Азын тоо / өнгө', paragraphs: [`${base.luckyNumber} / ${base.luckyColor}`] },
  ];
}

function mnOverallCue(sign: ZodiacSign, moonSign: ZodiacSign, seed: number): string {
  const signCue = pick([
    'Өнөөдөр өөрийгөө хэт шахахгүй атлаа чиглэлээ алдахгүй байх нь хамгийн зөв.',
    'Эхлээд дотоод хэмнэлээ тогтоож, дараа нь алхмаа сонговол алдаа багасна.',
    'Хурднаас илүү ямар зүйлд хүчээ өгөхөө зөв ялгах нь үр дүнг тодруулна.',
  ], seed);
  const moonElement = getZodiacInfo(moonSign).element;
  const emotionalCue = moonElement === 'water'
    ? 'Сэтгэл хөдлөлийн өнгө гүн тул хариу өгөхөөс өмнө мэдрэмжээ нэрлэвэл зөрчил багасна.'
    : moonElement === 'fire'
      ? 'Шийдвэр хурдан гаргах хүсэл нэмэгдэнэ, гэхдээ түр зогсож шалгах нэг мөч таныг алдааас хамгаална.'
      : moonElement === 'earth'
        ? 'Тогтвортой байдал хүсэх тул хоосон амлалтаас илүү бодит үйлдэлд тулгуурлаарай.'
        : 'Яриа, мессежийн өнгө амархан буруу ойлгогдож болох тул гол санаагаа энгийн өгүүл.';
  return `${signCue} ${emotionalCue}`;
}

function mnLoveCue(moonSign: ZodiacSign, venusSign: ZodiacSign, seed: number): string {
  const moonElement = getZodiacInfo(moonSign).element;
  const venusElement = getZodiacInfo(venusSign).element;
  const base = moonElement === 'water'
    ? 'Хайр дээр хамгийн түрүүнд аюулгүй мэдрэмж чухалдана.'
    : moonElement === 'fire'
      ? 'Хайр дээр шууд илэрхийлэл таталтыг нэмэгдүүлнэ, гэхдээ өнгө аяс огцом бол ойлголцол удааширч магадгүй.'
      : moonElement === 'earth'
        ? 'Хайр дээр жижиг боловч давтагдах халамж хамгийн их итгэл төрүүлнэ.'
        : 'Хайр дээр сонсох зай гаргаж, зөв цагтаа хариу өгөх нь үгнээс илүү нөлөөтэй.';
  const venusText = venusElement === 'air'
    ? 'Романтик холбоонд сонсох, зөв ойлгох чанар шууд нөлөөлнө.'
    : venusElement === 'earth'
      ? 'Дотно байдалд найдвартай байдал хамгийн хүчтэй дохио болно.'
      : venusElement === 'fire'
        ? 'Хүсэл тэмүүлэл амархан асах тул зөөлөн илэрхийлэл харилцааг урт амьсгалтай болгоно.'
        : 'Эмзэг мэдрэмжээ нуухгүй хэлэхэд харилцаа гүнзгийрнэ.';
  return `${pick([base, `${base} ${venusText}`, venusText], seed)}`;
}

function mnCareerCue(sunSign: ZodiacSign, mercurySign: ZodiacSign, seed: number): string {
  const sunElement = getZodiacInfo(sunSign).element;
  const mercuryElement = getZodiacInfo(mercurySign).element;
  const direction = sunElement === 'fire'
    ? 'Ажил дээр эхлүүлэх импульс хүчтэй байна, гэхдээ багийн хэмнэлтэй уялдуулах нь илүү ухаалаг.'
    : sunElement === 'earth'
      ? 'Ажил дээр хэмжигдэх зорилт тавивал нэр хүнд аажмаар бат бөх өснө.'
      : sunElement === 'air'
        ? 'Ажил дээр мэдээлэл эмхлэх, ойлгомжтой болгох чадвар тань гол давуу тал болж өгнө.'
        : 'Ажил дээр хүний хандлага, уур амьсгалыг зөв унших чадвар хэлэлцээний түлхүүр болно.';
  const execution = mercuryElement === 'fire'
    ? 'Товч, шийдэмгий өгүүлбэр шийдвэр хурдлуулна.'
    : mercuryElement === 'earth'
      ? 'Тоон баримт, хугацаа, хариуцлага тодорхой байвал маргаан багасна.'
      : mercuryElement === 'air'
        ? 'Санаагаа бүтэцтэй дарааллаар илэрхийлбэл эсэргүүцэл хурдан багасна.'
        : 'Эмпати шингэсэн харилцаа багийн итгэлийг нэмэгдүүлнэ.';
  return pick([`${direction} ${execution}`, direction, execution], seed);
}

function mnHealthCue(moonSign: ZodiacSign, phase: string, seed: number): string {
  const moonElement = getZodiacInfo(moonSign).element;
  const bodyLine = moonElement === 'fire'
    ? 'Бие эрчээ гаргах хүсэл өндөр байна: богино, тогтмол хөдөлгөөн хамгийн зохимжтой.'
    : moonElement === 'earth'
      ? 'Бие тогтвортой дэг хүсэж байна: хоол, нойр, ус гурваа тогтмол байлга.'
      : moonElement === 'air'
        ? 'Мэдрэлийн ачаалал өсөж магадгүй тул амьсгал, дэлгэцийн завсарлага илүү чухал.'
        : 'Сэтгэл, бие хоёулаа зөөлөн арчилгаа хүсэж байна: ус, дулаан, нам гүм орчин тусална.';
  const phaseLine = phase.includes('Full')
    ? 'Тэргэл үеэр мэдрэмж хурцрах хандлагатай тул оройн хэмнэлээ санаатайгаар удаашруулаарай.'
    : phase.includes('New')
      ? 'Шин сарны үед шинэ дэг эхлүүлэхэд тохиромжтой: жижиг, давтагдах алхмаас эхэл.'
      : phase.includes('Waning')
        ? 'Хорогдох үед илүүдэл ачааллаас цэгцлэн хасах шийдэл илүү үр дүнтэй.'
        : 'Өсөх үед сайн дадлаа бага багаар нэмбэл биед амархан сууж өгнө.';
  return pick([`${bodyLine} ${phaseLine}`, bodyLine, phaseLine], seed);
}

function mnFinanceCue(sunSign: ZodiacSign, moonSign: ZodiacSign, seed: number): string {
  const hasEarth = getZodiacInfo(sunSign).element === 'earth' || getZodiacInfo(moonSign).element === 'earth';
  return hasEarth
    ? pick([
      'Санхүүд өнөөдөр хамгаалах тактик илүү ашигтай: импульс худалдан авалтаа 24 цаг хойшлуул.',
      'Мөнгөний урсгалаа жижиг ангиллаар нь харвал илүүдэл зардал өөрөө тодорно.',
      'Хурдан ашиг хайхаас илүү тогтвортой төлөвлөгөө таны сэтгэлд илүү амар тайван өгнө.',
    ], seed)
    : pick([
      'Санхүү дээр сэтгэл хөөрлөөр бус, урьдчилан тохирсон дүрмээр шийдвэр гаргавал алдаа багасна.',
      'Өнөөдөр мөнгөний тухай яриаг хойшлуулахгүй хийх нь дарамтыг багасгана.',
      'Нэг том шийдвэрээс илүү хоёр жижиг, бодит алхам таны төсөвт илүү үр дүнтэй.',
    ], seed);
}

function mnAdviceCue(moonSign: ZodiacSign, seed: number): string {
  const element = getZodiacInfo(moonSign).element;
  if (element === 'water') {
    return pick([
      'Зөвлөгөө: оройн цагаар 20 минут өөртөө зориулсан чимээгүй хугацаа гарга.',
      'Зөвлөгөө: өнөөдрийн хамгийн хүчтэй мэдрэмжээ ганц өгүүлбэрээр тэмдэглэ.',
      'Зөвлөгөө: хэт ачаалал мэдрэгдвэл хариу өгөхөө түр азнаж, эхлээд амьсгалаа жигдэл.',
    ], seed);
  }
  if (element === 'fire') {
    return pick([
      'Зөвлөгөө: эхлэх ажлаа нэгээр хязгаарлаж, дуусгах хүртлээ анхаарлаа тараахгүй бай.',
      'Зөвлөгөө: огцом шийдвэрийн өмнө 10 минутын завсарлага авбал хараа илүү тэлнэ.',
      'Зөвлөгөө: эрчээ бусдад тулгахын оронд зорилгоо тод үгээр хэл.',
    ], seed);
  }
  if (element === 'earth') {
    return pick([
      'Зөвлөгөө: өнөөдрийн гурван чухал ажлаа цагтай нь бичиж, илүүг нь хасаарай.',
      'Зөвлөгөө: биеэ сонсох богино завсарлага өдрийн үр бүтээмжийг авардаг.',
      'Зөвлөгөө: тогтвортой байдал хэрэгтэй үед жижиг зан үйл хамгийн найдвартай тулгуур болдог.',
    ], seed);
  }
  return pick([
    'Зөвлөгөө: олон сувгийн мэдээллээ багасгаж, нэг асуудал дээр төвлөр.',
    'Зөвлөгөө: буруу ойлголцлоос сэргийлж гол санаагаа богино, энгийн хэлбэрээр давтаж баталгаажуул.',
    'Зөвлөгөө: яарах үедээ ч хариуг биш, асуултаа сайжруулахад нэг мөч зарцуул.',
  ], seed);
}

function mnLuckyColorCue(color: string, sunSign: ZodiacSign, seed: number): string {
  const element = getZodiacInfo(sunSign).element;
  const lines = element === 'fire'
    ? [
      `Өнөөдрийн өнгө ${color} — өөртөө итгэх дохиог зөөлөн атлаа тод гаргахад тусална.`,
      `${color} өнгө танд "эхлүүлэх эрч"-ийг тогтуун барихад дэмжлэг болно.`,
      `${color} өнгөний акцент таны шийдэмгий байдлыг хэт ширүүн бус, цэгцтэй мэдрүүлнэ.`,
    ]
    : element === 'earth'
      ? [
        `Өнөөдрийн өнгө ${color} — найдвартай, төвтэй мэдрэмжийг нэмэгдүүлнэ.`,
        `${color} өнгө танд төвлөрөл, бодит алхам хийх хандлагыг дэмжинэ.`,
        `${color} өнгийн жижиг деталь хүртэл өнөөдрийн хэмнэлийг илүү тайван болгоно.`,
      ]
      : element === 'air'
        ? [
          `Өнөөдрийн өнгө ${color} — харилцаанд илүү цэвэр, нээлттэй өнгө аяс нэмнэ.`,
          `${color} өнгө нь санаагаа эмхтэй илэрхийлэх уур амьсгалыг дэмжинэ.`,
          `${color} өнгөний сонголт өнөөдрийн оюуны хэт ачааллыг зөөллөнө.`,
        ]
        : [
          `Өнөөдрийн өнгө ${color} — сэтгэлийн эмзэг хэмнэлийг зөөлөн хамгаална.`,
          `${color} өнгө өнөөдөр дотоод амар тайвныг сэргээх жижиг түшиг болно.`,
          `${color} өнгийн орчин таны сэтгэл хөдлөлийг илүү зөөлөн зохицуулна.`,
        ];
  return pick(lines, seed);
}

function mnHouseCue(house: number): string {
  switch (house) {
    case 1: return 'өөрийн дүр төрх, итгэл';
    case 2: return 'мөнгө, үнэ цэн';
    case 3: return 'яриа, мессеж, ойрын холбоо';
    case 4: return 'гэр, гэр бүл, дотоод тайван';
    case 5: return 'дурлал, бүтээлч байдал';
    case 6: return 'өдрийн дэг, ажил-эрүүл мэнд';
    case 7: return 'хамтын харилцаа, түншлэл';
    case 8: return 'итгэл, гүн сэтгэл, хамтын санхүү';
    case 9: return 'алсын хараа, суралцахуй, аялал';
    case 10: return 'нэр хүнд, карьер';
    case 11: return 'найз нөхөд, баг, олон нийт';
    case 12: return 'дотоод айдас, чимээгүй эдгэрэл';
    default: return 'амьдралын эмзэг сэдэв';
  }
}

function selectMajorSkyAspect(planets: PlanetPosition[]): Aspect | undefined {
  const major: Array<{ type: Aspect['type']; angle: number; orb: number }> = [
    { type: 'conjunction', angle: 0, orb: 6 },
    { type: 'opposition', angle: 180, orb: 6 },
    { type: 'trine', angle: 120, orb: 5.5 },
    { type: 'square', angle: 90, orb: 5.5 },
    { type: 'sextile', angle: 60, orb: 4.5 },
  ];
  let best: Aspect | undefined;
  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const a = planets[i];
      const b = planets[j];
      let diff = Math.abs(a.longitude - b.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of major) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          const candidate: Aspect = {
            body1: a.name,
            body2: b.name,
            type: def.type,
            orb: Math.round(orb * 100) / 100,
            exactDegrees: def.angle,
          };
          if (!best || candidate.orb < best.orb) best = candidate;
          break;
        }
      }
    }
  }
  return best;
}
