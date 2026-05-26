export function compressRitualCopy(value: string, max = 132): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3).trim()}...`;
}

export function hasLegacyPremiumLanguage(value: string): boolean {
  return /(unlock more|access more|get access to more readings|premium feature|premium module|exclusive content|upgrade to unlock|unlock this content|locked feature|lose your streak|hurry|urgent)/i.test(value);
}
