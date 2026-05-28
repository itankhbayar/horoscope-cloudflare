import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

type Options = {
  threshold?: number;
};

/** Fires once when the target element is sufficiently visible in the viewport. */
export function useShareSectionVisibleOnce(
  target: Ref<HTMLElement | null>,
  onVisible: () => void,
  options: Options = {},
): { reset: () => void } {
  const threshold = options.threshold ?? 0.5;
  const seen = ref(false);
  let observer: IntersectionObserver | null = null;

  function disconnect(): void {
    observer?.disconnect();
    observer = null;
  }

  function observe(el: HTMLElement): void {
    disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        if (seen.value) return;
        const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= threshold);
        if (!visible) return;
        seen.value = true;
        onVisible();
        disconnect();
      },
      { threshold },
    );
    observer.observe(el);
  }

  watch(
    target,
    (el) => {
      if (!el || seen.value) return;
      observe(el);
    },
    { immediate: true },
  );

  onBeforeUnmount(disconnect);

  function reset(): void {
    seen.value = false;
    const el = target.value;
    if (el) observe(el);
  }

  return { reset };
}
