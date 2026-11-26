import { LOCALE_COOKIE } from './locale';

type Env = {
  ASSETS: { fetch(request: Request | URL): Promise<Response> };
};

const LOCALES = ['en', 'ru'];
const DEFAULT_LOCALE = 'en';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (/\.[a-z0-9]+$/i.test(url.pathname)) return env.ASSETS.fetch(request);

    const localized = localizedPath(request, url);
    if (localized) {
      return new Response(null, {
        status: 302,
        headers: { Location: localized, 'Cache-Control': 'no-store', Vary: 'Cookie, Accept-Language' },
      });
    }

    const page = await env.ASSETS.fetch(request);
    if (page.status !== 404) return page;
    return env.ASSETS.fetch(new URL('/200.html', url));
  },
};

/** Where an English page sends a visitor of another language, before the English HTML paints. */
function localizedPath(request: Request, url: URL): string | undefined {
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  const first = url.pathname.split('/')[1] ?? '';
  // Docs are English only, and a prefixed page already names its language.
  if (first === 'docs' || LOCALES.includes(first)) return;

  const locale = cookieLocale(request) ?? headerLocale(request);
  if (!locale || locale === DEFAULT_LOCALE) return;
  return `/${locale}${url.pathname === '/' ? '' : url.pathname}${url.search}`;
}

function cookieLocale(request: Request): string | undefined {
  const cookies = request.headers.get('Cookie') ?? '';
  const value = cookies.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`))?.[1];
  return value && LOCALES.includes(value) ? value : undefined;
}

function headerLocale(request: Request): string | undefined {
  const ranked = (request.headers.get('Accept-Language') ?? '')
    .split(',')
    .map(part => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.find(param => param.trim().startsWith('q='));
      return { locale: tag.split('-')[0]?.toLowerCase() ?? '', q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter(entry => LOCALES.includes(entry.locale) && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked[0]?.locale;
}
