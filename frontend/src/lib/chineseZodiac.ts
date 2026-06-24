import type { ChineseAnimal, ChineseAnimalInfo, ChineseElement } from './types';

/**
 * Client-side mirror of the backend Chinese-zodiac metadata (`backend/src/utils/chineseZodiac.ts`).
 * Language-neutral — display names come from i18n, exactly like the Western `ZODIAC_SIGNS`.
 */
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

export const CHINESE_ANIMAL_ORDER: ChineseAnimal[] = CHINESE_ANIMALS.map((a) => a.key);

export function getChineseAnimalInfo(animal: ChineseAnimal): ChineseAnimalInfo {
  return CHINESE_ANIMALS.find((a) => a.key === animal)!;
}

export function chineseAnimalEmoji(animal: ChineseAnimal): string {
  return getChineseAnimalInfo(animal).emoji;
}

/** Element accent color, harmonized with the Western `elementColor` palette. */
export function chineseElementColor(element: ChineseElement): string {
  switch (element) {
    case 'wood': return '#7bbf6a';
    case 'fire': return '#ff8a5c';
    case 'earth': return '#c9a84c';
    case 'metal': return '#cfd2d6';
    case 'water': return '#7eb6e6';
    default: return '#c9a84c';
  }
}
