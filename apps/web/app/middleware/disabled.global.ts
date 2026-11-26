import { DISABLED_PAGES } from '@/config/pages';

export default defineNuxtRouteMiddleware(to => {
  const disabledPage = useState<{ message?: string } | null>('disabled-page', () => null);

  const path = barePath(to.path);
  const exact = DISABLED_PAGES[path];
  const prefix = !exact
    ? Object.entries(DISABLED_PAGES).find(([page, cfg]) => cfg.disabled && path.startsWith(page + '/'))
    : undefined;

  const config = exact ?? prefix?.[1];

  if (config?.disabled) {
    disabledPage.value = { message: config.message };
  } else {
    disabledPage.value = null;
  }
});
