/** Cloudflare edge location that served the visitor's request, shown in the footer. */
export function useColocation() {
  return useState<string | null>('bx-colo', () => null);
}
