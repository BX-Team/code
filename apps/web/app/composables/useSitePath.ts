/** A path without its locale prefix: `/ru/account` → `/account`. */
export function barePath(path: string): string {
  return path.replace(/^\/ru(?=\/|$)/, '') || '/';
}

/** Docs are English only, so they keep their path; every other page of the site gets the current locale's prefix. */
export function isUnlocalized(path: string): boolean {
  return /^([a-z][a-z\d+.-]*:|\/\/)/i.test(path) || path.startsWith('#') || /^\/docs(?:[/?#]|$)/.test(path);
}

/** Turns a site path such as `/downloads/riven` into the current locale's copy of it. */
export function useSitePath() {
  const localePath = useLocalePath();
  return (path: string) => (isUnlocalized(path) ? path : localePath({ path }) || path);
}

/** The current route's path without its locale prefix, for code that matches on sections like `/account`. */
export function useBarePath() {
  const route = useRoute();
  return computed(() => barePath(route.path));
}
