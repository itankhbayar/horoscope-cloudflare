// Reusable merge: set `description` {en,mn} on cards by English name. Verbatim Waite EN + MN.
// Run once per batch: node scripts/setDescriptions.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardsPath = join(__dirname, '..', 'data', 'cards.json');

const DESC = {
  // ---- CUPS ----
  'Ace of Cups': {
    en: 'The waters are beneath, and thereon are water-lilies; the hand issues from the cloud, holding in its palm the cup, from which four streams are pouring; a dove, bearing in its bill a cross-marked Host, descends to place the Wafer in the Cup; the dew of water is falling on all sides. It is an intimation of that which may lie behind the Lesser Arcana.',
    mn: 'Доор нь ус, дээр нь сараана цэцэг; үүлнээс гар гарч, алган дээрээ аяга барих ба түүнээс дөрвөн урсгал асгарна; хушуундаа загалмайтай талх барьсан тагтаа буун ирж талхыг аяганд тавина; усны шүүдэр хаа сайгүй унана. Энэ нь Бага Арканы цаана нуугдаж буй зүйлийн зөн совин юм.',
  },
  'Two of Cups': {
    en: "A youth and maiden are pledging one another, and above their cups rises the Caduceus of Hermes, between the great wings of which there appears a lion's head. It is a variant of a sign which is found in a few old examples of this card. Some curious emblematical meanings are attached to it, but they do not concern us in this place.",
    mn: 'Залуу хүү, охин хоёр бие биедээ тангараглах ба аяганых нь дээгүүр Хермесийн очирт таяг босох бөгөөд түүний том далавчуудын хооронд арслангийн толгой харагдана. Энэ нь зарим хуучин хувилбаруудад тохиолддог тэмдгийн нэг хэлбэр юм. Үүнд зарим сонин бэлгэдлийн утга агуулагддаг ч энд тэдгээр нь бидэнд хамаагүй.',
  },
  'Three of Cups': {
    en: 'Maidens in a garden-ground with cups uplifted, as if pledging one another.',
    mn: 'Цэцэрлэгт охид аягаа өргөн, бие биедээ тангараглаж буй мэт.',
  },
  'Four of Cups': {
    en: 'A young man is seated under a tree and contemplates three cups set on the grass before him; an arm issuing from a cloud offers him another cup. His expression notwithstanding is one of discontent with his environment.',
    mn: 'Залуу хүү модны доор сууж, өмнөх өвсөн дээр тавьсан гурван аягыг ажина; үүлнээс гарч ирсэн гар түүнд өөр нэгэн аяга санал болгоно. Гэсэн ч төрх нь орчиндоо сэтгэл дундуур байгааг илтгэнэ.',
  },
  'Five of Cups': {
    en: 'A dark, cloaked figure, looking sideways at three prone cups; two others stand upright behind him; a bridge is in the background, leading to a small keep or holding.',
    mn: 'Бараан, нөмрөгт дүр хажуу тийшээ унасан гурван аягыг ажина; ард нь хоёр аяга босоо зогсоно; цаана нь голын гүүр бөгөөд жижиг цайз эсвэл эзэмшил рүү хөтөлнө.',
  },
  'Six of Cups': {
    en: 'Children in an old garden, their cups filled with flowers.',
    mn: 'Хуучин цэцэрлэгт хүүхдүүд, аяганууд нь цэцгээр дүүрэн.',
  },
  'Seven of Cups': {
    en: 'Strange chalices of vision, but the images are more especially those of the fantastic spirit.',
    mn: 'Үзэгдлийн хачирхалтай хундагууд, гэвч дүрслэлүүд нь голчлон уран сэтгэмжийн сүнсийнх юм.',
  },
  'Eight of Cups': {
    en: 'A man of dejected aspect is deserting the cups of his felicity, enterprise, undertaking or previous concern.',
    mn: 'Гунигт төрхтэй эр аз жаргал, үйлс, эхлүүлсэн ажил буюу өмнөх асуудлынхаа аягануудыг орхин одно.',
  },
  'Nine of Cups': {
    en: 'A goodly personage has feasted to his heart’s content, and abundant refreshment of wine is on the arched counter behind him, seeming to indicate that the future is also assured. The picture offers the material side only, but there are other aspects.',
    mn: 'Эрхэм хүн сэтгэл хангалуун найрлаж, ард нь нуман тавиур дээр элбэг дарс байгаа нь ирээдүй мөн баталгаатайг илтгэх мэт. Зураг нь зөвхөн материаллаг талыг харуулна, гэвч өөр талууд бий.',
  },
  'Ten of Cups': {
    en: 'Appearance of Cups in a rainbow; it is contemplated in wonder and ecstasy by a man and woman below, evidently husband and wife. His right arm is about her; his left is raised upward; she raises her right arm. The two children dancing near them have not observed the prodigy but are happy after their own manner. There is a home-scene beyond.',
    mn: 'Аяганууд солонгон дунд илрэх; доор нь эр эм хоёр—илтэд нөхөр, эхнэр хоёр—гайхширал, баяр баясгалангаар үүнийг ажина. Түүний баруун гар эмэгтэйг тэвэрч, зүүн гар нь дээш өргөгдсөн; эмэгтэй баруун гараа өргөнө. Ойролцоо бүжиглэх хоёр хүүхэд гайхамшгийг анзаараагүй ч өөрсдийнхөөрөө аз жаргалтай. Цаана нь гэр орны дүр зураг.',
  },
  'Page of Cups': {
    en: 'A fair, pleasing, somewhat effeminate page, of studious and intent aspect, contemplates a fish rising from a cup to look at him. It is the pictures of the mind taking form.',
    mn: 'Цайвар царайтай, тааламжтай, зөөлөн төрхтэй элч судлангуй, анхааралтай байдалтайгаар аяганаас гарч ирэн түүн рүү харж буй загасыг ажина. Энэ нь оюун санааны дүрслэл бий болж буйг илэрхийлнэ.',
  },
  'Knight of Cups': {
    en: 'Graceful, but not warlike; riding quietly, wearing a winged helmet, referring to those higher graces of the imagination which sometimes characterize this card. He too is a dreamer, but the images of the side of sense haunt him in his vision.',
    mn: 'Гоо сайхан боловч дайчин бус; далавчит дуулга өмсөн нам гүм давхих нь энэ хөзөрт зарим үед илрэх төсөөллийн дээд нигүүлслийг хэлж байна. Тэр бас мөрөөдөгч боловч мэдрэхүйн талын дүрслэлүүд түүний зүүдэнд сэглэнэ.',
  },
  'Queen of Cups': {
    en: 'Beautiful, fair, dreamy—as one who sees visions in a cup. This is, however, only one of her aspects; she sees, but she also acts, and her activity feeds her dream.',
    mn: 'Үзэсгэлэнтэй, цайвар, мөрөөдөмтгий—аяган дотор үзэгдэл хардаг хүн мэт. Гэвч энэ нь түүний нэг л тал; тэр хардаг боловч мөн үйлддэг бөгөөд үйл нь зүүдийг нь тэжээдэг.',
  },
  'King of Cups': {
    en: 'He holds a short sceptre in his left hand and a great cup in his right; his throne is set upon the sea; on one side a ship is riding and on the other a dolphin is leaping. The implicit is that the Sign of the Cup naturally refers to water, which appears in all the court cards.',
    mn: 'Тэрээр зүүн гартаа богино очирт таяг, баруун гартаа том аяга барина; сэнтий нь далай дээр тогтжээ; нэг талд хөлөг онгоц хөвж, нөгөө талд далайн гахай үсэрнэ. Аяганы тэмдэг нь бүх ордын хөзөрт илэрдэг уснаас санаа авсан гэдгийг далдуур илэрхийлнэ.',
  },

  // ---- WANDS ----
  'Ace of Wands': {
    en: 'A hand issuing from a cloud grasps a stout wand or club.',
    mn: 'Үүлнээс гарч ирсэн гар бат бэх саваа буюу бороохой атгана.',
  },
  'Two of Wands': {
    en: 'A tall man looks from a battlemented roof over sea and shore; he holds a globe in his right hand, while a staff in his left rests on the battlement; another is fixed in a ring. The Rose and Cross and Lily should be noticed on the left side.',
    mn: 'Өндөр эр цайзын дээврээс далай, эрэг рүү ширтэнэ; баруун гартаа бөмбөрцөг барьж, зүүн гартаа таяг цайзын хашлага дээр тулна; өөр нэг нь цагирагт бэхлэгджээ. Зүүн талд Сарнай, Загалмай, Сараана цэцгийг анзаараарай.',
  },
  'Three of Wands': {
    en: "A calm, stately personage, with his back turned, looking from a cliff's edge at ships passing over the sea. Three staves are planted in the ground, and he leans slightly on one of them.",
    mn: 'Тайван, сүрлэг хүн нуруугаа эргүүлэн, хадны ирмэгээс далайгаар хөвөх хөлөг онгоцуудыг ширтэнэ. Газарт гурван таяг суулгасан бөгөөд тэр нэгэн дээр нь бага зэрэг тулна.',
  },
  'Four of Wands': {
    en: 'From the four great staves planted in the foreground there is a great garland suspended; two female figures uplift nosegays; at their side is a bridge over a moat, leading to an old manorial house.',
    mn: 'Урд талд суулгасан дөрвөн том таягнаас том хэлхээ дүүжлэгдэнэ; хоёр эмэгтэй цэцгийн баглаа өргөнө; хажууд нь шуудуун дээгүүр гүүр бөгөөд хуучин язгууртны харш руу хөтөлнө.',
  },
  'Five of Wands': {
    en: 'A posse of youths, who are brandishing staves, as if in sport or strife. It is mimic warfare.',
    mn: 'Залуусын бүлэг савааг ёлолдуулан, тоглож буюу тэмцэлдэж буй мэт. Энэ бол хуурамч тулаан.',
  },
  'Six of Wands': {
    en: 'A laurelled horseman bears one staff adorned with a laurel crown; footmen with staves are at his side.',
    mn: 'Лаврын титэмт морьтон лаврын титмээр чимэглэсэн нэг таяг барина; хажууд нь явган цэргүүд саваатай зогсоно.',
  },
  'Seven of Wands': {
    en: 'A young man on a craggy eminence brandishing a staff; six other staves are raised towards him from below.',
    mn: 'Хадтай өндөрлөг дээр залуу хүү таяг даллаж; доороос зургаан таяг түүн рүү өргөгдөнө.',
  },
  'Eight of Wands': {
    en: 'The card represents motion through the immovable—a flight of wands through an open country; but they draw to the term of their course. That which they signify is at hand; it may be even on the threshold.',
    mn: 'Хөзөр нь хөдөлгөөнгүйгээр дамжих хөдөлгөөнийг—задгай нутгаар нисэх саваануудыг дүрслэнэ; гэвч тэдгээр нь замынхаа төгсгөлд ойртож байна. Тэдний илэрхийлэх зүйл ойртсон; босгон дээр ч байж магадгүй.',
  },
  'Nine of Wands': {
    en: 'The figure leans upon his staff and has an expectant look, as if awaiting an enemy. Behind are eight other staves—erect, in orderly disposition, like a palisade.',
    mn: 'Дүр таяган дээрээ тулж, дайсныг хүлээж буй мэт хүлээлттэй харцтай. Ард нь өөр найман таяг—босоо, эмх цэгцтэйгээр, хашаа мэт.',
  },
  'Ten of Wands': {
    en: 'A man oppressed by the weight of the ten staves which he is carrying.',
    mn: 'Эр өөрийн үүрч буй арван таягны хүндийн дор дарагджээ.',
  },
  'Page of Wands': {
    en: 'In a scene similar to the former, a young man stands in the act of proclamation. He is unknown but faithful, and his tidings are strange.',
    mn: 'Өмнөхтэй төстэй дүр зурагт залуу хүү тунхаглаж буй байдалтай зогсоно. Тэр үл мэдэгдэх боловч үнэнч, мэдээ нь сонин.',
  },
  'Knight of Wands': {
    en: 'He is shewn as if upon a journey, armed with a short wand, and although mailed is not on a warlike errand. He is passing mounds or pyramids. The motion of the horse is a key to the character of its rider, and suggests the precipitate mood, or things connected therewith.',
    mn: 'Тэрээр аян замд явж буй мэт, богино саваагаар зэвсэглэсэн ч хуяг өмссөн боловч дайнд мордсонгүй. Тэр овоо буюу пирамидуудыг өнгөрнө. Морины хөдөлгөөн нь морьтны зан чанарын түлхүүр бөгөөд яаруу зан буюу түүнтэй холбоотой зүйлийг илтгэнэ.',
  },
  'Queen of Wands': {
    en: "The Wands throughout this suit are always in leaf, as it is a suit of life and animation. Emotionally and otherwise, the Queen's personality corresponds to that of the King, but is more magnetic.",
    mn: 'Энэ ордны савааг үргэлж навчтайгаар дүрсэлдэг нь амьдрал, эрч хүчний орд учраас юм. Сэтгэлийн болон бусад талаараа Хатны зан чанар Хааны зантай тохирох боловч илүү соронзон татамтай.',
  },
  'King of Wands': {
    en: 'The physical and emotional nature to which this card is attributed is dark, ardent, lithe, animated, impassioned, noble. The King uplifts a flowering wand, and wears, like his three correspondences in the remaining suits, what is called a cap of maintenance beneath his crown. He connects with the symbol of the lion, which is emblazoned on the back of his throne.',
    mn: 'Энэ хөзөрт хамаарах бие болон сэтгэлийн төрх нь бараан, галт, уян, амьд, хүсэл тэмүүлэлтэй, эрхэмсэг. Хаан цэцэглэсэн саваа өргөж, бусад гурван ордны адилаар титмийнхээ доор «хадгалалтын малгай» гэдгийг өмсөнө. Тэрээр сэнтийнхээ ард дүрсэлсэн арслангийн бэлгэдэлтэй холбогдоно.',
  },

  // ---- SWORDS ----
  'Ace of Swords': {
    en: 'A hand issues from a cloud, grasping a sword, the point of which is encircled by a crown.',
    mn: 'Үүлнээс гар гарч, сэлэм атгах ба үзүүр нь титмээр хүрээлэгджээ.',
  },
  'Two of Swords': {
    en: 'A hoodwinked female figure balances two swords upon her shoulders.',
    mn: 'Нүдээ боосон эмэгтэй дүр мөрөн дээрээ хоёр сэлэм тэнцвэржүүлнэ.',
  },
  'Three of Swords': {
    en: 'Three swords piercing a heart; cloud and rain behind.',
    mn: 'Зүрхийг хатгасан гурван сэлэм; ард нь үүл, бороо.',
  },
  'Four of Swords': {
    en: 'The effigy of a knight in the attitude of prayer, at full length upon his tomb.',
    mn: 'Залбирах байдалтай баатрын хөшөө булшныхаа дээр бүтэн биеэрээ хэвтэнэ.',
  },
  'Five of Swords': {
    en: 'A disdainful man looks after two retreating and dejected figures. Their swords lie upon the ground. He carries two others on his left shoulder, and a third sword is in his right hand, point to earth. He is the master in possession of the field.',
    mn: 'Үл ойшоосон эр ухран, гонсойн одох хоёр дүрийг ширтэнэ. Тэдний сэлэм газар хэвтэнэ. Тэр зүүн мөрөн дээрээ хоёрыг үүрч, баруун гартаа гурав дахь сэлмийг үзүүрийг нь газар чиглүүлэн барина. Тэр талбайг эзэмшсэн эзэн юм.',
  },
  'Six of Swords': {
    en: 'A ferryman carrying passengers in his punt to the further shore. The course is smooth, and seeing that the freight is light, it may be noted that the work is not beyond his strength.',
    mn: 'Завьчин зорчигчдыг завиараа цаад эрэг рүү зөөнө. Зам тайван бөгөөд ачаа хөнгөн тул ажил түүний хүчнээс хэтрэхгүй гэдгийг анзаарч болно.',
  },
  'Seven of Swords': {
    en: 'A man in the act of carrying away five swords rapidly; the two others of the card remain stuck in the ground. A camp is close at hand.',
    mn: 'Эр таван сэлмийг хурдан зөөж явах байдалтай; хөзрийн нөгөө хоёр сэлэм газарт хатгаастай үлдэнэ. Ойролцоо хуаран бий.',
  },
  'Eight of Swords': {
    en: 'A woman, bound and hoodwinked, with the swords of the card about her. Yet it is rather a card of temporary durance than of irretrievable bondage.',
    mn: 'Хүлэгдэж, нүдээ боолгосон эмэгтэйн эргэн тойронд хөзрийн сэлмүүд байна. Гэвч энэ нь эргэлт буцалтгүй боолчлолоос илүү түр зуурын хорилт юм.',
  },
  'Nine of Swords': {
    en: 'One seated on her couch in lamentation, with the swords over her. She is as one who knows no sorrow which is like unto hers. It is a card of utter desolation.',
    mn: 'Нэгэн хүн орон дээрээ суун гашуудах ба дээр нь сэлмүүд байна. Тэр өөрийнхтэй адил гуниг гэж үгүй мэт. Энэ бол туйлын ганцаардал, эзгүйрлийн хөзөр.',
  },
  'Ten of Swords': {
    en: 'A prostrate figure, pierced by all the swords belonging to the card.',
    mn: 'Хөзөрт хамаарах бүх сэлмэнд хатгагдсан хэвтэх дүр.',
  },
  'Page of Swords': {
    en: 'A lithe, active figure holds a sword upright in both hands, while in the act of swift walking. He is passing over rugged land, and about his way the clouds are collocated wildly. He is alert and lithe, looking this way and that, as if an expected enemy might appear at any moment.',
    mn: 'Уян, идэвхтэй дүр сэлмийг хоёр гараараа босоо барьж, хурдан алхана. Тэр барзгар газраар өнгөрөх ба замынх нь эргэн тойронд үүлс эмх замбараагүй цуглажээ. Тэр сэрэмжтэй, уян, хүлээгдэж буй дайсан хэдийд ч гарч ирэх мэт энэ тийш ширтэнэ.',
  },
  'Knight of Swords': {
    en: 'He is riding in full course, as if scattering his enemies. In the design he is really a prototypical hero of romantic chivalry. He might almost be Galahad, whose sword is swift and sure because he is clean of heart.',
    mn: 'Тэр бүрэн хурдаар давхих ба дайснуудаа тарааж буй мэт. Зурагт тэр үнэндээ романтик баатарлагийн жишиг баатар юм. Тэр бараг л Галахад байж болох бөгөөд зүрх сэтгэл нь цэвэр учраас сэлэм нь хурдан, баттай.',
  },
  'Queen of Swords': {
    en: 'Her right hand raises the weapon vertically and the hilt rests on an arm of her royal chair; the left hand is extended, the arm raised; her countenance is severe but chastened; it suggests familiarity with sorrow. It does not represent mercy, and, her sword notwithstanding, she is scarcely a symbol of power.',
    mn: 'Баруун гар нь зэвсгийг босоогоор өргөж, бариул нь хааны сандлынх нь түшлэг дээр тулна; зүүн гар нь сунгасан, мутар нь өргөгдсөн; төрх нь хатуу боловч номхруулагдсан; гунигтай танил болохыг илтгэнэ. Энэ нь өршөөлийг төлөөлдөггүй бөгөөд сэлэмтэй ч атугай тэрээр хүч чадлын бэлгэдэл бараг биш.',
  },
  'King of Swords': {
    en: 'He sits in judgment, holding the unsheathed sign of his suit. He recalls, of course, the conventional symbol of justice in the Trumps Major, and he may represent this virtue, but he is rather the power of life and death, in virtue of his office.',
    mn: 'Тэр шүүн заларч, ордныхоо хуйнаас сугалсан тэмдгийг барина. Тэр мэдээж Их Аркан дахь шударга ёсны уламжлалт бэлгэдлийг санагдуулах ба энэ буянг төлөөлж болох боловч албан тушаалынхаа хүчээр амь нас, үхлийн эрх мэдэл нь илүү юм.',
  },

  // ---- PENTACLES ----
  'Ace of Pentacles': {
    en: 'A hand—issuing, as usual, from a cloud—holds up a pentacle.',
    mn: 'Ердийнхөөрөө үүлнээс гарч ирсэн гар зоос өргөнө.',
  },
  'Two of Pentacles': {
    en: 'A young man, in the act of dancing, has a pentacle in either hand, and they are joined by that endless cord which is like the number 8 reversed.',
    mn: 'Залуу хүү бүжиглэх үедээ хоёр гартаа зоос барих ба тэдгээр нь 8-г урвуулсан мэт төгсгөлгүй уяагаар холбогдоно.',
  },
  'Three of Pentacles': {
    en: 'A sculptor at his work in a monastery. Compare the design which illustrates the Eight of Pentacles. The apprentice or amateur therein has received his reward and is now at work in earnest.',
    mn: 'Хийдэд ажиллаж буй уран барималч. Пентаклийн Наймыг дүрсэлсэн зурагтай харьцуул. Тэндэх дадлагажигч буюу сонирхогч шагналаа авч, одоо чармайн ажиллаж байна.',
  },
  'Four of Pentacles': {
    en: 'A crowned figure, having a pentacle over his crown, clasps another with hands and arms; two pentacles are under his feet. He holds to that which he has.',
    mn: 'Титмийнхээ дээр зоостой титэмт дүр өөр нэгийг гар, гараараа тэвэрнэ; хоёр зоос хөлийнх нь доор байна. Тэр эзэмшсэн зүйлдээ зууралдана.',
  },
  'Five of Pentacles': {
    en: 'Two mendicants in a snow-storm pass a lighted casement.',
    mn: 'Цасан шуурганд хоёр гуйлгачин гэрэлтэй цонхыг өнгөрнө.',
  },
  'Six of Pentacles': {
    en: 'A person in the guise of a merchant weighs money in a pair of scales and distributes it to the needy and distressed. It is a testimony to his own success in life, as well as to his goodness of heart.',
    mn: 'Худалдаачны дүртэй хүн жинлүүрээр мөнгө жинлэж, гачигдсан, зовсон хүмүүст хуваарилна. Энэ нь түүний амьдралын амжилт, мөн зүрхний сайхан сэтгэлийн гэрч юм.',
  },
  'Seven of Pentacles': {
    en: 'A young man, leaning on his staff, looks intently at seven pentacles attached to a clump of greenery on his right; one would say that these were his treasures and that his heart was there.',
    mn: 'Залуу хүү таяган дээрээ тулж, баруун талд нь ногоон бутанд наалдсан долоон зоосыг анхааралтай ширтэнэ; эдгээр нь түүний эрдэнэс бөгөөд зүрх сэтгэл нь тэнд байгаа мэт.',
  },
  'Eight of Pentacles': {
    en: 'An artist in stone at his work, which he exhibits in the form of trophies.',
    mn: 'Чулуунд ажиллах урчин бүтээлээ цомын хэлбэрээр үзүүлнэ.',
  },
  'Nine of Pentacles': {
    en: 'A woman, with a bird upon her wrist, stands amidst a great abundance of grapevines in the garden of a manorial house. It is a wide domain, suggesting plenty in all things. Possibly it is her own possession and testifies to material well-being.',
    mn: 'Эмэгтэй бугуйдаа шувуутайгаар язгууртны харшийн цэцэрлэгт элбэг усан үзмийн модны дунд зогсоно. Энэ бол өргөн уудам эзэмшил бөгөөд бүх зүйлийн элбэг дэлбэгийг илтгэнэ. Магадгүй энэ нь түүний өөрийн эзэмшил бөгөөд материаллаг сайн сайхныг гэрчилнэ.',
  },
  'Ten of Pentacles': {
    en: "A man and woman beneath an archway which gives entrance to a house and domain. They are accompanied by a child, who looks curiously at two dogs accosting an ancient personage seated in the foreground. The child's hand is on one of them.",
    mn: 'Гэр болон эзэмшил рүү орох хаалга бүхий нуман доор эр, эм хоёр. Тэдэнтэй хамт хүүхэд байх ба урд талд сууж буй өндөр настай хүн рүү дөхөж буй хоёр нохойг сониучирхан харна. Хүүхдийн гар нэгэн дээр нь байна.',
  },
  'Page of Pentacles': {
    en: 'A youthful figure, looking intently at the pentacle which hovers over his raised hands. He moves slowly, insensible of that which is about him.',
    mn: 'Залуу дүр өргөсөн гарынхаа дээгүүр эргэлдэх зоосыг анхааралтай ширтэнэ. Тэр эргэн тойрноо мэдрэлгүйгээр удаан хөдөлнө.',
  },
  'Knight of Pentacles': {
    en: 'He rides a slow, enduring, heavy horse, to which his own aspect corresponds. He exhibits his symbol, but does not look therein.',
    mn: 'Тэрээр удаан, тэсвэртэй, хүнд морь унах ба өөрийн төрх нь түүнд тохирно. Тэр бэлгэдлээ үзүүлэх боловч түүн рүү харахгүй.',
  },
  'Queen of Pentacles': {
    en: 'The face suggests that of a dark woman, whose qualities might be summed up in the idea of greatness of soul; she has also the serious cast of intelligence; she contemplates her symbol and may see worlds therein.',
    mn: 'Царай нь бараан эмэгтэйнх мэт, чанаруудыг нь сэтгэлийн агуу байдал гэж дүгнэж болно; мөн ноцтой ухаалаг төрхтэй; тэр бэлгэдлээ ажиглах ба дотор нь ертөнцийг харж магадгүй.',
  },
  'King of Pentacles': {
    en: 'The figure calls for no special description; the face is rather dark, suggesting also courage, but somewhat lethargic in tendency. The bull’s head should be noted as a recurrent symbol on the throne. The sign of this suit is represented throughout as engraved or blazoned with the pentagram, typifying the correspondence of the four elements in human nature and that by which they may be governed. In many old Tarot packs this suit stood for current coin, money, deniers. I have not invented the substitution of pentacles and I have no special cause to sustain in respect of the alternative. But the consensus of divinatory meanings is on the side of some change, because the cards do not happen to deal especially with questions of money.',
    mn: 'Дүр онцгой тайлбар шаардахгүй; царай нь нэлээд бараан, зориг илтгэх боловч зарим талаар нойрмог хандлагатай. Сэнтий дээр давтагдах бэлгэдэл болох бухын толгойг анзаараарай. Энэ ордны тэмдгийг хүний мөн чанарын дөрвөн махбодын тохирол болон тэдгээрийг захирах ёсыг илтгэх пентаграммаар сийлж буюу зураглажээ. Олон хуучин Тарот хөзрөнд энэ орд нь зоос, мөнгийг төлөөлдөг байв. Пентаклийн орлуулалтыг би зохиогоогүй бөгөөд энэ хувилбарыг хамгаалах онцгой шалтгаан надад үгүй. Гэвч мэргэ төлгийн утгуудын зөвшилцөл нь зарим өөрчлөлтийн талд байдаг, учир нь хөзрүүд мөнгөний асуудлыг тусгайлан хөнддөггүй.',
  },
};

const data = JSON.parse(readFileSync(cardsPath, 'utf8'));
const names = new Set([...data.major, ...data.minor].map((c) => c.name.en));
let n = 0;
for (const group of ['major', 'minor']) {
  for (const card of data[group]) {
    const d = DESC[card.name.en];
    if (d) {
      card.description = { en: d.en.trim(), mn: d.mn.trim() };
      n += 1;
    }
  }
}
const unmatched = Object.keys(DESC).filter((k) => !names.has(k));
const maxLen = Math.max(...[...data.major, ...data.minor].flatMap((c) => [c.description.en.length, c.description.mn.length]));
writeFileSync(cardsPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Set descriptions on', n, 'cards. Unmatched keys:', unmatched, 'maxDescLen:', maxLen);
