import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getStorage } from '../lib/storage';
import type { ZodiacMode } from '../lib/zodiacModeRoutes';

const MODE_KEY = 'astralis_zodiac_mode_v1';

export const useZodiacModeStore = defineStore('zodiacMode', () => {
  const mode = ref<ZodiacMode>('western');

  async function hydrate(): Promise<void> {
    const raw = await getStorage().getItem(MODE_KEY);
    if (raw === 'western' || raw === 'chinese') {
      mode.value = raw;
    } else if (raw !== null) {
      await getStorage().removeItem(MODE_KEY);
    }
  }

  async function setMode(next: ZodiacMode): Promise<void> {
    mode.value = next;
    await getStorage().setItem(MODE_KEY, next);
  }

  async function toggle(): Promise<void> {
    await setMode(mode.value === 'western' ? 'chinese' : 'western');
  }

  return { mode, hydrate, setMode, toggle };
});
