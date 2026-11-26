<script setup lang="ts">
const disabledPage = useState<{ message?: string } | null>('disabled-page');

const localeHead = useLocaleHead({ seo: true });
const path = useBarePath();
// Docs exist in English only, so they say so and offer no other language.
const docs = computed(() => isUnlocalized(path.value));
useHead({
  htmlAttrs: { lang: () => (docs.value ? 'en' : localeHead.value.htmlAttrs.lang) },
  link: () => (docs.value ? [] : localeHead.value.link),
  meta: () => (docs.value ? [] : localeHead.value.meta),
});
</script>

<template>
	<DisabledPage v-if="disabledPage" :message="disabledPage.message" />
	<template v-else>
		<SiteBanner />
		<NuxtLayout>
			<NuxtRouteAnnouncer />
			<NuxtPage />
		</NuxtLayout>
		<CommandPalette />
		<SiteToaster />
	</template>
</template>
