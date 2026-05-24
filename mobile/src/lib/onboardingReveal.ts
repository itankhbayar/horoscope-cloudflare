import type { NatalChart } from '@astralis/lib/types';

export const SKY_MAPPING_STEPS = [
  'Mapping the sky above your birthplace...',
  'Calculating planetary positions...',
  'Anchoring your chart to the real sky...',
  'Reading your first chart pattern...',
] as const;

export type RevealCard = {
  label: string;
  title: string;
  body: string;
};

export function skyMappingStep(index: number): string {
  return SKY_MAPPING_STEPS[Math.abs(index) % SKY_MAPPING_STEPS.length] ?? SKY_MAPPING_STEPS[0];
}

export function whyBirthplaceMatters(city?: string | null): string {
  const place = city?.trim();
  return place
    ? `Birthplace matters because the sky is local. ${place} anchors the horizon line and house map used for your chart.`
    : 'Birthplace matters because the sky is local. Your city anchors the horizon line and house map used for your chart.';
}

export function buildNatalRevealCards(chart: NatalChart | null | undefined): RevealCard[] {
  if (!chart) return [];
  const cards: RevealCard[] = [
    {
      label: 'Sun',
      title: chart.sunInfo.name,
      body: `Your Sun is calculated in ${chart.sunInfo.name}, the core solar anchor of your chart.`,
    },
    {
      label: 'Moon',
      title: chart.moonInfo.name,
      body: `Your Moon is calculated in ${chart.moonInfo.name}, the emotional rhythm Astralis reads from your birth sky.`,
    },
  ];

  if (chart.risingInfo) {
    cards.push({
      label: 'Rising',
      title: chart.risingInfo.name,
      body: `Your Rising sign is ${chart.risingInfo.name}, based on the eastern horizon at your birth time and place.`,
    });
  } else {
    cards.push({
      label: 'Rising',
      title: 'Birth time needed',
      body: 'Add an exact birth time later to calculate your rising sign and house angles.',
    });
  }

  return cards;
}
