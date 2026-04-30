<script setup lang="ts">
import { computed } from 'vue';
import type { NatalChart } from '../lib/types';
import { getZodiacInfo, planetSymbol } from '../lib/zodiac';

const props = defineProps<{
  chart: NatalChart;
}>();

const SIZE = 380;
const CENTER = SIZE / 2;
const OUTER_R = 175;
const HOUSE_R = 145;
const PLANET_R = 115;

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER - radius * Math.sin(rad) };
}

const ascendant = computed(() => props.chart.houses[0]?.longitude ?? 0);
const rotateAngle = computed(() => 180 - ascendant.value);

const signSegments = computed(() => {
  return Array.from({ length: 12 }, (_, i) => {
    const startDeg = i * 30;
    const midDeg = startDeg + 15;
    const start = polar(startDeg + rotateAngle.value, OUTER_R);
    const end = polar(startDeg + 30 + rotateAngle.value, OUTER_R);
    const labelPos = polar(midDeg + rotateAngle.value, OUTER_R - 18);
    const innerStart = polar(startDeg + rotateAngle.value, HOUSE_R);
    return {
      lineX2: start.x,
      lineY2: start.y,
      labelX: labelPos.x,
      labelY: labelPos.y,
      symbol: getZodiacInfo(['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'][i] as any).symbol,
      innerStart,
      end,
    };
  });
});

const housePoints = computed(() =>
  props.chart.houses.map((h) => {
    const p = polar(h.longitude + rotateAngle.value, OUTER_R);
    const inner = polar(h.longitude + rotateAngle.value, 50);
    return { ...h, p, inner };
  }),
);

const planetPoints = computed(() =>
  props.chart.planets.map((planet) => {
    const p = polar(planet.longitude + rotateAngle.value, PLANET_R);
    return { ...planet, p };
  }),
);
</script>

<template>
  <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="chart-wheel" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(40, 20, 90, 0.5)" />
        <stop offset="100%" stop-color="rgba(10, 10, 26, 0.9)" />
      </radialGradient>
    </defs>
    <circle :cx="CENTER" :cy="CENTER" :r="OUTER_R" fill="url(#bgGradient)" stroke="rgba(201,168,76,0.4)" stroke-width="1.5" />
    <circle :cx="CENTER" :cy="CENTER" :r="HOUSE_R" fill="none" stroke="rgba(201,168,76,0.2)" stroke-width="1" />
    <circle :cx="CENTER" :cy="CENTER" :r="PLANET_R - 12" fill="none" stroke="rgba(201,168,76,0.1)" stroke-width="1" />

    <line v-for="(seg, i) in signSegments" :key="`spoke-${i}`"
          :x1="seg.innerStart.x" :y1="seg.innerStart.y"
          :x2="seg.lineX2" :y2="seg.lineY2"
          stroke="rgba(201,168,76,0.25)" stroke-width="0.8" />

    <text v-for="(seg, i) in signSegments" :key="`sym-${i}`"
          :x="seg.labelX" :y="seg.labelY"
          fill="#c9a84c" text-anchor="middle" alignment-baseline="middle"
          font-size="14">{{ seg.symbol }}</text>

    <g v-for="house in housePoints" :key="`h-${house.number}`">
      <line :x1="CENTER" :y1="CENTER" :x2="house.p.x" :y2="house.p.y"
            stroke="rgba(201,168,76,0.15)" stroke-width="0.5" stroke-dasharray="2,3" />
      <text :x="house.inner.x" :y="house.inner.y" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle" alignment-baseline="middle">{{ house.number }}</text>
    </g>

    <g v-for="planet in planetPoints" :key="planet.name">
      <circle :cx="planet.p.x" :cy="planet.p.y" r="11" fill="rgba(15, 15, 40, 0.8)" stroke="rgba(201,168,76,0.6)" stroke-width="0.8" />
      <text :x="planet.p.x" :y="planet.p.y" fill="#e8d48b" font-size="13" text-anchor="middle" alignment-baseline="middle">{{ planetSymbol(planet.name) }}</text>
    </g>
  </svg>
</template>

<style scoped>
.chart-wheel {
  width: 100%;
  max-width: 380px;
  height: auto;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 0 30px rgba(201, 168, 76, 0.15));
}
</style>
