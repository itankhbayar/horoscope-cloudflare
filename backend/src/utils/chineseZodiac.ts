/**
 * Chinese (lunar) zodiac metadata + a lunar-calendar resolver.
 *
 * Mirrors `utils/zodiac.ts` for the Western signs: this module is language-neutral
 * (display names come from i18n on the client, like the Western signs). It owns the
 * structural facts — fixed element, yin/yang, trine groups, six clashes, six
 * harmonies, lucky numbers — plus the Chinese New Year table needed to map a birth
 * date to the correct animal year (the zodiac year starts at the Spring Festival,
 * not Jan 1).
 */

export type ChineseAnimal =
  | 'rat'
  | 'ox'
  | 'tiger'
  | 'rabbit'
  | 'dragon'
  | 'snake'
  | 'horse'
  | 'goat'
  | 'monkey'
  | 'rooster'
  | 'dog'
  | 'pig';

export type ChineseElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type YinYang = 'yin' | 'yang';

export interface ChineseAnimalInfo {
  key: ChineseAnimal;
  /** 1–12 position in the cycle (Rat = 1). */
  order: number;
  emoji: string;
  /** The animal's permanent ("fixed") element, distinct from the year-cycle element. */
  fixedElement: ChineseElement;
  /** Fixed polarity by position (odd order = yang, even = yin). */
  yinYang: YinYang;
  /** Trine ("compatibility triangle") group, 1–4. Same group = strong affinity. */
  trineGroup: number;
  /** The animal six positions away — the traditional clash/opposition. */
  conflictAnimal: ChineseAnimal;
  /** The "secret friend" (six harmonies) — a strong supportive pairing. */
  secretFriend: ChineseAnimal;
  /** Traditional lucky numbers. */
  luckyNumbers: number[];
}

export const ANIMAL_ORDER: ChineseAnimal[] = [
  'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake',
  'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig',
];

export const CHINESE_ANIMALS: ChineseAnimalInfo[] = [
  { key: 'rat', order: 1, emoji: '\u{1F42D}', fixedElement: 'water', yinYang: 'yang', trineGroup: 1, conflictAnimal: 'horse', secretFriend: 'ox', luckyNumbers: [2, 3] },
  { key: 'ox', order: 2, emoji: '\u{1F402}', fixedElement: 'earth', yinYang: 'yin', trineGroup: 2, conflictAnimal: 'goat', secretFriend: 'rat', luckyNumbers: [1, 4] },
  { key: 'tiger', order: 3, emoji: '\u{1F42F}', fixedElement: 'wood', yinYang: 'yang', trineGroup: 3, conflictAnimal: 'monkey', secretFriend: 'pig', luckyNumbers: [1, 3, 4] },
  { key: 'rabbit', order: 4, emoji: '\u{1F430}', fixedElement: 'wood', yinYang: 'yin', trineGroup: 4, conflictAnimal: 'rooster', secretFriend: 'dog', luckyNumbers: [3, 4, 6] },
  { key: 'dragon', order: 5, emoji: '\u{1F409}', fixedElement: 'earth', yinYang: 'yang', trineGroup: 1, conflictAnimal: 'dog', secretFriend: 'rooster', luckyNumbers: [1, 6, 7] },
  { key: 'snake', order: 6, emoji: '\u{1F40D}', fixedElement: 'fire', yinYang: 'yin', trineGroup: 2, conflictAnimal: 'pig', secretFriend: 'monkey', luckyNumbers: [2, 8, 9] },
  { key: 'horse', order: 7, emoji: '\u{1F434}', fixedElement: 'fire', yinYang: 'yang', trineGroup: 3, conflictAnimal: 'rat', secretFriend: 'goat', luckyNumbers: [2, 3, 7] },
  { key: 'goat', order: 8, emoji: '\u{1F411}', fixedElement: 'earth', yinYang: 'yin', trineGroup: 4, conflictAnimal: 'ox', secretFriend: 'horse', luckyNumbers: [3, 4, 9] },
  { key: 'monkey', order: 9, emoji: '\u{1F435}', fixedElement: 'metal', yinYang: 'yang', trineGroup: 1, conflictAnimal: 'tiger', secretFriend: 'snake', luckyNumbers: [4, 9] },
  { key: 'rooster', order: 10, emoji: '\u{1F413}', fixedElement: 'metal', yinYang: 'yin', trineGroup: 2, conflictAnimal: 'rabbit', secretFriend: 'dragon', luckyNumbers: [5, 7, 8] },
  { key: 'dog', order: 11, emoji: '\u{1F415}', fixedElement: 'earth', yinYang: 'yang', trineGroup: 3, conflictAnimal: 'dragon', secretFriend: 'rabbit', luckyNumbers: [3, 4, 9] },
  { key: 'pig', order: 12, emoji: '\u{1F417}', fixedElement: 'water', yinYang: 'yin', trineGroup: 4, conflictAnimal: 'snake', secretFriend: 'tiger', luckyNumbers: [2, 5, 8] },
];

export function getChineseAnimalInfo(animal: ChineseAnimal): ChineseAnimalInfo {
  return CHINESE_ANIMALS.find((a) => a.key === animal)!;
}

export function isChineseAnimal(value: string): value is ChineseAnimal {
  return ANIMAL_ORDER.includes(value as ChineseAnimal);
}

/**
 * Chinese New Year (Spring Festival) Gregorian dates, 1924–2044 — two full sexagenary
 * cycles, covering every plausible living user's birth year. A birth date on/after the
 * listed date belongs to that animal year; before it, to the previous animal year.
 * Years outside this range fall back to a fixed Feb 4 (Lichun) approximation.
 */
export const LUNAR_NEW_YEAR: Record<number, string> = {
  1924: '1924-02-05', 1925: '1925-01-24', 1926: '1926-02-13', 1927: '1927-02-02',
  1928: '1928-01-23', 1929: '1929-02-10', 1930: '1930-01-30', 1931: '1931-02-17',
  1932: '1932-02-06', 1933: '1933-01-26', 1934: '1934-02-14', 1935: '1935-02-04',
  1936: '1936-01-24', 1937: '1937-02-11', 1938: '1938-01-31', 1939: '1939-02-19',
  1940: '1940-02-08', 1941: '1941-01-27', 1942: '1942-02-15', 1943: '1943-02-05',
  1944: '1944-01-25', 1945: '1945-02-13', 1946: '1946-02-02', 1947: '1947-01-22',
  1948: '1948-02-10', 1949: '1949-01-29', 1950: '1950-02-17', 1951: '1951-02-06',
  1952: '1952-01-27', 1953: '1953-02-14', 1954: '1954-02-03', 1955: '1955-01-24',
  1956: '1956-02-12', 1957: '1957-01-31', 1958: '1958-02-18', 1959: '1959-02-08',
  1960: '1960-01-28', 1961: '1961-02-15', 1962: '1962-02-05', 1963: '1963-01-25',
  1964: '1964-02-13', 1965: '1965-02-02', 1966: '1966-01-21', 1967: '1967-02-09',
  1968: '1968-01-30', 1969: '1969-02-17', 1970: '1970-02-06', 1971: '1971-01-27',
  1972: '1972-02-15', 1973: '1973-02-03', 1974: '1974-01-23', 1975: '1975-02-11',
  1976: '1976-01-31', 1977: '1977-02-18', 1978: '1978-02-07', 1979: '1979-01-28',
  1980: '1980-02-16', 1981: '1981-02-05', 1982: '1982-01-25', 1983: '1983-02-13',
  1984: '1984-02-02', 1985: '1985-02-20', 1986: '1986-02-09', 1987: '1987-01-29',
  1988: '1988-02-17', 1989: '1989-02-06', 1990: '1990-01-27', 1991: '1991-02-15',
  1992: '1992-02-04', 1993: '1993-01-23', 1994: '1994-02-10', 1995: '1995-01-31',
  1996: '1996-02-19', 1997: '1997-02-07', 1998: '1998-01-28', 1999: '1999-02-16',
  2000: '2000-02-05', 2001: '2001-01-24', 2002: '2002-02-12', 2003: '2003-02-01',
  2004: '2004-01-22', 2005: '2005-02-09', 2006: '2006-01-29', 2007: '2007-02-18',
  2008: '2008-02-07', 2009: '2009-01-26', 2010: '2010-02-14', 2011: '2011-02-03',
  2012: '2012-01-23', 2013: '2013-02-10', 2014: '2014-01-31', 2015: '2015-02-19',
  2016: '2016-02-08', 2017: '2017-01-28', 2018: '2018-02-16', 2019: '2019-02-05',
  2020: '2020-01-25', 2021: '2021-02-12', 2022: '2022-02-01', 2023: '2023-01-22',
  2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06',
  2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03', 2031: '2031-01-23',
  2032: '2032-02-11', 2033: '2033-01-31', 2034: '2034-02-19', 2035: '2035-02-08',
  2036: '2036-01-28', 2037: '2037-02-15', 2038: '2038-02-04', 2039: '2039-01-24',
  2040: '2040-02-12', 2041: '2041-02-01', 2042: '2042-01-22', 2043: '2043-02-10',
  2044: '2044-01-30',
};

/** Lichun (~Feb 4) cutoff used for birth years outside the LUNAR_NEW_YEAR table. */
function approxNewYear(year: number): string {
  return `${year}-02-04`;
}

/**
 * Resolves the "zodiac year" a birth date belongs to. The animal year runs from one
 * Spring Festival to the next, so a date before that year's Chinese New Year still
 * belongs to the previous animal year.
 */
export function zodiacYearFromDate(birthDateISO: string): number {
  const calendarYear = Number(birthDateISO.slice(0, 4));
  const newYear = LUNAR_NEW_YEAR[calendarYear] ?? approxNewYear(calendarYear);
  // Lexicographic comparison is safe for ISO `YYYY-MM-DD` strings.
  return birthDateISO < newYear ? calendarYear - 1 : calendarYear;
}

/** Maps a zodiac year to its animal. 1924 (cycle start) = Rat; `(year - 4) mod 12`. */
export function animalFromYear(zodiacYear: number): ChineseAnimal {
  const idx = ((zodiacYear - 4) % 12 + 12) % 12;
  return ANIMAL_ORDER[idx];
}

/** Maps a birth date to its animal, honoring the lunar-new-year boundary. */
export function animalFromDate(birthDateISO: string): ChineseAnimal {
  return animalFromYear(zodiacYearFromDate(birthDateISO));
}

/**
 * The year-cycle element + polarity (the 60-year cycle: 5 elements × yin/yang × 12 animals).
 * From the year stem: last digit 0/1 metal, 2/3 water, 4/5 wood, 6/7 fire, 8/9 earth;
 * even year = yang, odd = yin.
 */
export function elementFromYear(zodiacYear: number): { element: ChineseElement; yinYang: YinYang } {
  const lastDigit = ((zodiacYear % 10) + 10) % 10;
  const element: ChineseElement =
    lastDigit < 2 ? 'metal'
    : lastDigit < 4 ? 'water'
    : lastDigit < 6 ? 'wood'
    : lastDigit < 8 ? 'fire'
    : 'earth';
  const yinYang: YinYang = zodiacYear % 2 === 0 ? 'yang' : 'yin';
  return { element, yinYang };
}

export interface ChineseProfile {
  animal: ChineseAnimal;
  /** Year-cycle element (changes every 2 years). */
  element: ChineseElement;
  /** Year-cycle polarity. */
  yinYang: YinYang;
  /** The animal's permanent element. */
  fixedElement: ChineseElement;
  zodiacYear: number;
  luckyNumbers: number[];
}

/** Full Chinese-zodiac birth profile derived purely from a birth date. */
export function getChineseProfile(birthDateISO: string): ChineseProfile {
  const zodiacYear = zodiacYearFromDate(birthDateISO);
  const animal = animalFromYear(zodiacYear);
  const info = getChineseAnimalInfo(animal);
  const { element, yinYang } = elementFromYear(zodiacYear);
  return {
    animal,
    element,
    yinYang,
    fixedElement: info.fixedElement,
    zodiacYear,
    luckyNumbers: info.luckyNumbers,
  };
}
