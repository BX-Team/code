export const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ||
  (import.meta.dev ? '1x00000000000000000000AA' : '0x4AAAAAAGNvnTn3_RSJJDAq');

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | undefined;

function load(): Promise<Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')));
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Turnstile did not load'));
    };
    document.head.append(script);
  });
  return loading;
}

/** Renders the widget into `el`; `onToken` gets each fresh token, and `null` once it expires. */
export async function mountTurnstile(el: HTMLElement, onToken: (token: string | null) => void) {
  const turnstile = await load();
  const id = turnstile.render(el, {
    sitekey: TURNSTILE_SITE_KEY,
    theme: 'dark',
    size: 'flexible',
    language: 'en',
    // Shown only when Cloudflare wants a click; most visitors never see it.
    appearance: 'interaction-only',
    callback: (token: string) => onToken(token),
    'expired-callback': () => onToken(null),
    'error-callback': () => onToken(null),
  });
  return {
    reset: () => {
      onToken(null);
      turnstile.reset(id);
    },
    remove: () => turnstile.remove(id),
  };
}
