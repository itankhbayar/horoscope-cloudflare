import { onMounted, onUnmounted } from 'vue';

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
  let previousTitle = '';
  const previousNamed = new Map<MetaName, string | null>();
  const previousProperties = new Map<MetaProperty, string | null>();
  let previousCanonical: string | null = null;

  onMounted(() => {
    previousTitle = document.title;
    document.title = options.title;
    const canonical = `${window.location.origin}${options.canonicalPath}`;
    const imageUrl = `${window.location.origin}${options.imagePath ?? '/og/default.svg'}`;
    previousNamed.set('description', setNamedMeta('description', options.description));
    previousNamed.set('robots', setNamedMeta('robots', options.robots ?? 'index,follow'));
    previousNamed.set('twitter:card', setNamedMeta('twitter:card', 'summary_large_image'));
    previousNamed.set('twitter:title', setNamedMeta('twitter:title', options.title));
    previousNamed.set('twitter:description', setNamedMeta('twitter:description', options.description));
    previousNamed.set('twitter:image', setNamedMeta('twitter:image', imageUrl));
    previousProperties.set('og:type', setPropertyMeta('og:type', options.type ?? 'website'));
    previousProperties.set('og:title', setPropertyMeta('og:title', options.title));
    previousProperties.set('og:description', setPropertyMeta('og:description', options.description));
    previousProperties.set('og:url', setPropertyMeta('og:url', canonical));
    previousProperties.set('og:image', setPropertyMeta('og:image', imageUrl));
    previousCanonical = setCanonical(canonical);
  });

  onUnmounted(() => {
    document.title = previousTitle;
    for (const [name, value] of previousNamed) {
      if (value !== null) setNamedMeta(name, value);
    }
    for (const [property, value] of previousProperties) {
      if (value !== null) setPropertyMeta(property, value);
    }
    if (previousCanonical !== null) setCanonical(previousCanonical);
  });
}
