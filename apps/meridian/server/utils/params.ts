import type { H3Event } from 'h3';

export function requireParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name);
  if (!value) throw createError({ statusCode: 400, message: `Missing route param: ${name}` });
  return value;
}
