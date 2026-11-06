/** Mirrors form state into the URL without navigating: `router.replace` counts as a
 *  route change and Nuxt scrolls the page back to the top on every keystroke. */
export function syncQuery(params: Record<string, string | undefined>): void {
  if (!import.meta.client) return;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }

  const query = search.toString();
  const url = query ? `${location.pathname}?${query}` : location.pathname;
  window.history.replaceState(window.history.state, '', url);
}
