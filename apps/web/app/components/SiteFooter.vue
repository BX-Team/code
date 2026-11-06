<script setup lang="ts">
import { Footer, type FooterLink } from '@bx-team/ui';
import { DISCORD_URL, GITHUB_URL, MAVEN_URL } from '~/config/links';

const links: FooterLink[] = [
  { label: 'Team', href: '/team' },
  { label: 'Docs', href: '/docs' },
  { label: 'Downloads', href: '/downloads' },
  { label: 'Tools', href: '/tools' },
];

const socials: FooterLink[] = [
  { label: 'GitHub', href: GITHUB_URL, external: true },
  { label: 'Discord', href: DISCORD_URL, external: true },
  { label: 'Maven', href: MAVEN_URL, external: true },
];
</script>

<template>
	<Footer :links="links" :socials="socials" :github-href="GITHUB_URL" />
</template>
