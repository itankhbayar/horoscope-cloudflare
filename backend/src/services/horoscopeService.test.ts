import { describe, expect, it, vi } from 'vitest';
import { getOrCreateDailyHoroscope } from './horoscopeService';

function makeSelectReturning(row: unknown) {
  return {
    from: () => ({
      where: () => ({
        get: async () => row,
      }),
    }),
  };
}

describe('getOrCreateDailyHoroscope legacy MN upgrade', () => {
  it('upgrades cached old MN row without premium-depth content', async () => {
    const legacyRow = {
      id: '1',
      sign: 'gemini',
      date: '2026-05-20',
      lang: 'mn',
      overall: 'Өнөөдөр тайван бай.',
      love: 'Харилцаандаа анхаар.',
      career: 'Ажилдаа төвлөр.',
      health: 'Амар.',
      luckyNumber: 7,
      luckyColor: 'Цэнхэр',
    };
    const updateRun = vi.fn(async () => {});
    const db = {
      select: vi.fn(() => makeSelectReturning(legacyRow)),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            run: updateRun,
          }),
        }),
      })),
      insert: vi.fn(),
    } as any;

    const result = await getOrCreateDailyHoroscope(db, 'gemini', 'mn', '2026-05-20');
    expect(updateRun).toHaveBeenCalledTimes(1);
    expect((result.blocks ?? []).length).toBeGreaterThanOrEqual(6);
    expect((result.finance ?? '').length).toBeGreaterThan(20);
    expect((result.advice ?? '').length).toBeGreaterThan(20);
    expect(result.overall.length).toBeGreaterThan(300);
  });

  it('hydrates legacy MN row at runtime when blocks are missing', async () => {
    const legacyLongRow = {
      id: '2',
      sign: 'taurus',
      date: '2026-05-28',
      lang: 'mn',
      overall: 'Өнөөдөр та өөрийнхөө дотоод хэмнэлийг анзаарах нь чухал бөгөөд яарахгүй, шат дараатай төлөвлөхөд илүү тогтвортой үр дүн гарна. Өглөөнөөс орой хүртэл нэг гол зорилгод төвлөрч, жижиг шийдвэрүүдээ дарааллаар нь хийх нь сэтгэлийн дарамтыг багасгаж, ажлын чанарыг өсгөнө. Яаралтай мэдрэмж төрөх мөч бүрт амьсгалаа удаашруулж, хийх ажлаа эрэмбэлбэл анхаарал сарнихгүй. Оройдоо өнөөдрийн ахицаа товч тэмдэглэж, маргаашийн эхний алхмаа урьдчилан бичих нь танд тогтвортой байдал өгнө.',
      love: 'Харилцаанд тайлбарлахын өмнө сонсох орон зай гаргавал үл ойлголцол багасч, итгэлцэл нэмэгдэнэ. Хариу өгөхөөсөө өмнө нөгөө хүний мэдрэмжийг давтаж баталгаажуулах нь ярилцлагын өнгийг зөөлрүүлдэг. Өнөөдөр жижиг анхаарал, тогтвортой халамж хоёр том амлалтаас илүү хүчтэй нөлөөтэй байна. Дотно сэдэв хөндөх үед буруутгах өнгө аяснаас зайлсхийж, хэрэгцээгээ энгийн хэлбэрээр илэрхийлээрэй.',
      career: 'Ажил дээр бодит алхам, хугацааны тодорхой байдал хоёр өнөөдрийн чанартай ахицын гол суурь болно. Хурдтай эхлэхээс илүү дуусгах шалгуураа эхэнд нь тодорхойлох нь бүтээмжийг тогтвортой хадгална. Багийн харилцаанд үүрэг хариуцлага, хугацаа, хүлээлтээ нэг мөр болгон бичиж баталгаажуулах нь давхардсан ажил багасгана. Өдрийн төгсгөлд дараагийн алхамын жагсаалтаа шинэчилж үлдээвэл маргаашийн эхлэл илүү цэгцтэй байна.',
      health: 'Бие, сэтгэлийн ачааллыг тэнцвэржүүлэхийн тулд ус, амралт, богино хөдөлгөөнийг өдөртөө тогтмол хуваарилаарай. Өдрийн турш дэлгэцийн хэрэглээг завсарлуулж, амьсгалаа жигдрүүлэх богино дасгал хийх нь мэдрэлийн ядаргааг бууруулна. Нойрны өмнөх нэг цагт ачаалалтай мэдээллээс зай авч, тайван хэмнэлд шилжих нь сэргэлтийн чанарыг нэмэгдүүлдэг. Хэт ачаалал мэдрэгдсэн мөчид багахан алхалт хийж, ус уух дадлыг давтвал төвлөрөл тогтвортой болно.',
      luckyNumber: 9,
      luckyColor: 'Ногоон',
    };
    const updateRun = vi.fn(async () => {});
    const db = {
      select: vi.fn(() => makeSelectReturning(legacyLongRow)),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            run: updateRun,
          }),
        }),
      })),
      insert: vi.fn(),
    } as any;

    const result = await getOrCreateDailyHoroscope(db, 'taurus', 'mn', '2026-05-28');
    expect(updateRun).toHaveBeenCalledTimes(1);
    expect((result.blocks ?? []).length).toBeGreaterThanOrEqual(6);
    expect((result.finance ?? '').length).toBeGreaterThan(20);
    expect((result.advice ?? '').length).toBeGreaterThan(20);
    expect(result.overall.length).toBeGreaterThan(250);
    expect(result.career.length).toBeGreaterThan(150);
  });
});

