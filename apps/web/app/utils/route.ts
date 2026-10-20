/** Drops a trailing slash so a route path matches the slash-less paths `@nuxt/content` stores. */
export function stripTrailingSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}
