import { DISABLED_PAGES } from '@/config/pages';

export default defineNuxtRouteMiddleware((to) => {
	const disabledPage = useState<{ message?: string } | null>('disabled-page', () => null);

	const exact = DISABLED_PAGES[to.path];
	const prefix = !exact
		? Object.entries(DISABLED_PAGES).find(([path, cfg]) => cfg.disabled && to.path.startsWith(path + '/'))
		: undefined;

	const config = exact ?? prefix?.[1];

	if (config?.disabled) {
		disabledPage.value = { message: config.message };
	} else {
		disabledPage.value = null;
	}
});
