<script setup lang="ts">
import BrandMark from './BrandMark.vue';

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

withDefaults(
  defineProps<{
    /** Site pages, beside the lockup. */
    links: FooterLink[];
    /** Elsewhere on the web, on the right. */
    socials: FooterLink[];
    githubHref?: string;
    brandHref?: string;
  }>(),
  {
    githubHref: 'https://github.com/BX-Team',
    brandHref: '/',
  },
);
</script>

<template>
	<footer class="bx-footer">
		<div class="bx-footer__inner">
			<div class="bx-footer__brand">
				<div class="bx-footer__row">
					<a :href="brandHref" class="bx-footer__lockup">
						<BrandMark :size="20" />
						<span>BX Team</span>
					</a>
					<nav class="bx-footer__links" aria-label="Site">
						<a v-for="link in links" :key="link.label" :href="link.href">{{ link.label }}</a>
					</nav>
				</div>
				<p class="bx-footer__legal">
					Not an official Minecraft service. Not approved by or associated with Mojang Studios or Microsoft.
				</p>
			</div>

			<div class="bx-footer__meta">
				<nav class="bx-footer__socials" aria-label="Elsewhere">
					<a
						v-for="link in socials"
						:key="link.label"
						:href="link.href"
						:target="link.external ? '_blank' : undefined"
						:rel="link.external ? 'noopener noreferrer' : undefined"
					>{{ link.label }}</a>
				</nav>
				<p>
					© {{ new Date().getFullYear() }} BX Team · Hosted on
					<a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare</a>
				</p>
			</div>
		</div>
	</footer>
</template>

<style scoped>
.bx-footer {
	border-top: 1px solid var(--line);
	padding: 0 var(--s-4) env(safe-area-inset-bottom);
}

.bx-footer__inner {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: var(--s-6);
	max-width: var(--container);
	margin: 0 auto;
	padding: var(--s-8) 0 var(--s-10);
}

.bx-footer__brand {
	flex: 1 1 420px;
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.bx-footer__row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-1) var(--s-4);
}

.bx-footer__lockup {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	min-height: 32px;
	margin-right: var(--s-1);
	font: 700 15px var(--font-sans);
	color: var(--fg);
}

.bx-footer__links,
.bx-footer__socials {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-1) var(--s-4);
}

.bx-footer__links a,
.bx-footer__socials a {
	display: inline-flex;
	align-items: center;
	min-height: 32px;
	font: 400 14px/1.4 var(--font-sans);
	transition: color 0.15s ease;
}

.bx-footer__links a {
	color: var(--mute);
}

.bx-footer__socials a {
	color: var(--dim);
}

.bx-footer__links a:hover,
.bx-footer__socials a:hover {
	color: var(--fg-hi);
}

.bx-footer__legal {
	margin: 0;
	max-width: 60ch;
	font: 500 10px/1.7 var(--font-sans);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--mute);
}

.bx-footer__meta {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10px;
}

.bx-footer__meta p {
	margin: 0;
	font: 400 14px/1.4 var(--font-sans);
	color: var(--mute);
}

.bx-footer__meta p a {
	color: var(--dim);
	transition: color 0.15s ease;
}

.bx-footer__meta p a:hover {
	color: var(--fg-hi);
}

.bx-footer__meta .bx-footer__open {
	color: var(--accent);
}

@media (max-width: 640px) {
	.bx-footer__meta {
		align-items: flex-start;
	}
}
</style>
