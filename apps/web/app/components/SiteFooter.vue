<script setup lang="ts">
import { Footer, type FooterLink, type FooterStrings } from '@bx-team/ui';
import { DISCORD_URL, GITHUB_URL, MAVEN_URL } from '~/config/links';

const { t } = useI18n();
const sitePath = useSitePath();

const links = computed<FooterLink[]>(() => [
  { label: t('nav.team'), href: sitePath('/team') },
  { label: t('nav.docs'), href: '/docs' },
  { label: t('nav.downloads'), href: sitePath('/downloads') },
  { label: t('nav.tools'), href: sitePath('/tools') },
]);

const socials: FooterLink[] = [
  { label: 'GitHub', href: GITHUB_URL, external: true },
  { label: 'Discord', href: DISCORD_URL, external: true },
  { label: 'Maven', href: MAVEN_URL, external: true },
];

const strings = computed<FooterStrings>(() => ({
  site: t('footer.site'),
  elsewhere: t('footer.elsewhere'),
  legal: t('footer.legal'),
  hostedOn: t('footer.hostedOn'),
}));
</script>

<template>
	<Footer :links="links" :socials="socials" :github-href="GITHUB_URL" :brand-href="sitePath('/')" :strings="strings" />
</template>
