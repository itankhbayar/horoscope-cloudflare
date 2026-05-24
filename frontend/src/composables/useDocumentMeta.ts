import { onMounted } from 'vue';

type MetaName = 'description' | 'robots' | 'twitter:card' | 'twitter:title' | 'twitter:description' | 'twitter:image';
type MetaProperty = 'og:type' | 'og:title' | 'og:description' | 'og:url' | 'og:image';

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

function setPropertyMeta(property: MetaProperty, content: string): string | null {
  const selector = `meta[property="${property}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const previous = el?.getAttribute('content') ?? null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
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
  imagePath?: string;
  type?: 'website' | 'article';
  robots?: 'index,follow' | 'noindex,nofollow';
}): void {
  onMounted(() => {
    document.title = options.title;
    const canonical = `${window.location.origin}${options.canonicalPath}`;
    const imageUrl = `${window.location.origin}${options.imagePath ?? '/og/default.svg'}`;
    setNamedMeta('description', options.description);
    setNamedMeta('robots', options.robots ?? 'index,follow');
    setNamedMeta('twitter:card', 'summary_large_image');
    setNamedMeta('twitter:title', options.title);
    setNamedMeta('twitter:description', options.description);
    setNamedMeta('twitter:image', imageUrl);
    setPropertyMeta('og:type', options.type ?? 'website');
    setPropertyMeta('og:title', options.title);
    setPropertyMeta('og:description', options.description);
    setPropertyMeta('og:url', canonical);
    setPropertyMeta('og:image', imageUrl);
    setCanonical(canonical);
  });
}
