import { onMounted, onUnmounted } from 'vue';

type MetaName = 'description';

function setNamedMeta(name: MetaName, content: string): string | null {
  const selector = `meta[name="${name}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const previous = el?.getAttribute('content') ?? null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return previous;
}

function setCanonical(href: string): string | null {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const previous = el?.getAttribute('href') ?? null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return previous;
}

export function useDocumentMeta(options: {
  title: string;
  description: string;
  canonicalPath: string;
}): void {
  let previousTitle = '';
  let previousDescription: string | null = null;
  let previousCanonical: string | null = null;

  onMounted(() => {
    previousTitle = document.title;
    document.title = options.title;
    previousDescription = setNamedMeta('description', options.description);
    previousCanonical = setCanonical(`${window.location.origin}${options.canonicalPath}`);
  });

  onUnmounted(() => {
    document.title = previousTitle;
    if (previousDescription !== null) setNamedMeta('description', previousDescription);
    if (previousCanonical !== null) setCanonical(previousCanonical);
  });
}
