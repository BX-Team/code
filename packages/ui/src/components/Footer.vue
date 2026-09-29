<script setup lang="ts">
import BrandMark from './BrandMark.vue';
import PixelField from './PixelField.vue';

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

withDefaults(
  defineProps<{
    columns: FooterColumn[];
    blurb?: string;
    githubHref?: string;
    discordHref?: string;
    brandHref?: string;
  }>(),
  {
    blurb: 'Open source community building high-quality server software, plugins and developer tools for Minecraft.',
    brandHref: '/',
  },
);
</script>

<template>
	<footer class="bx-footer">
		<PixelField variant="field" />

		<div class="bx-footer__inner">
			<div class="bx-footer__top">
				<div class="bx-footer__brand">
					<a :href="brandHref" class="bx-footer__lockup" data-quiet>
						<BrandMark :size="22" />
						<span>BX Team</span>
					</a>
					<p class="bx-footer__blurb" data-quiet>{{ blurb }}</p>
					<div class="bx-footer__socials" data-quiet>
						<a
							v-if="githubHref"
							:href="githubHref"
							class="bx-footer__social"
							aria-label="GitHub"
							title="GitHub"
							target="_blank"
							rel="noopener noreferrer"
						>
							<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
							</svg>
						</a>
						<a
							v-if="discordHref"
							:href="discordHref"
							class="bx-footer__social"
							aria-label="Discord"
							title="Discord"
							target="_blank"
							rel="noopener noreferrer"
						>
							<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
							</svg>
						</a>
					</div>
				</div>

				<div class="bx-footer__cols" :style="{ '--bx-footer-cols': columns.length }">
					<nav v-for="col in columns" :key="col.title" class="bx-footer__col" :aria-label="col.title" data-quiet>
						<h2 class="bx-footer__heading">{{ col.title }}</h2>
						<ul>
							<li v-for="link in col.links" :key="link.label">
								<a
									:href="link.href"
									:target="link.external ? '_blank' : undefined"
									:rel="link.external ? 'noopener noreferrer' : undefined"
								>{{ link.label }}</a>
							</li>
						</ul>
					</nav>
				</div>
			</div>

			<div class="bx-footer__end">
				<p data-quiet>© {{ new Date().getFullYear() }} BX Team. Not affiliated with Mojang Studios or Microsoft.</p>
				<p data-quiet>
					Hosted on
					<a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare</a>
				</p>
			</div>
		</div>
	</footer>
</template>

<style scoped>
.bx-footer {
	position: relative;
	isolation: isolate;
	overflow: hidden;
	border-top: 1px solid var(--line);
	background: var(--pixel-bg);
	padding-bottom: env(safe-area-inset-bottom);
}

.bx-footer__inner {
	position: relative;
	max-width: var(--container);
	margin: 0 auto;
	padding: var(--s-16) var(--s-8) var(--s-8);
}

.bx-footer__top {
	display: flex;
	justify-content: space-between;
	gap: var(--s-10);
}

.bx-footer__brand {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 24rem;
	flex-shrink: 0;
}

.bx-footer__lockup {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	font: 600 16px var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
}

.bx-footer__blurb {
	margin: var(--s-4) 0 0;
	max-width: 36ch;
	font: 400 13.5px/1.6 var(--font-mono);
	color: var(--mute);
	text-wrap: pretty;
}

.bx-footer__socials {
	display: flex;
	gap: var(--s-1);
	margin-top: var(--s-4);
	margin-left: -8px;
}

.bx-footer__social {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border-radius: var(--r-1);
	color: var(--mute);
	transition:
		color 0.15s ease,
		background-color 0.15s ease;
}

.bx-footer__social:hover {
	color: var(--fg-hi);
	background: var(--surface-2);
}

.bx-footer__cols {
	display: grid;
	flex: 1;
	min-width: 0;
	grid-template-columns: repeat(var(--bx-footer-cols, 4), minmax(0, 1fr));
	gap: var(--s-10) var(--s-6);
}

.bx-footer__col {
	align-self: start;
}

.bx-footer__heading {
	margin: 0;
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--mute);
}

.bx-footer__col ul {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 14px 0 0;
	padding: 0;
	list-style: none;
}

.bx-footer__col a,
.bx-footer__end a {
	font: 400 13.5px/1.4 var(--font-mono);
	color: var(--dim);
	text-decoration: underline;
	text-decoration-color: transparent;
	text-underline-offset: 4px;
	transition:
		color 0.15s ease,
		text-decoration-color 0.15s ease;
}

.bx-footer__col a:hover,
.bx-footer__end a:hover {
	color: var(--accent);
	text-decoration-color: currentColor;
}

.bx-footer__end {
	display: flex;
	justify-content: space-between;
	gap: var(--s-2) var(--s-6);
	margin-top: var(--s-12);
	padding-top: var(--s-6);
	border-top: 1px solid var(--line);
}

.bx-footer__end p {
	margin: 0;
	font: 400 12.5px/1.5 var(--font-mono);
	color: var(--mute);
}

@media (max-width: 1023px) {
	.bx-footer__top {
		flex-direction: column;
	}

	.bx-footer__brand {
		width: auto;
	}
}

@media (max-width: 640px) {
	.bx-footer__inner {
		padding: var(--s-12) var(--s-4) var(--s-6);
	}

	.bx-footer__cols {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.bx-footer__end {
		flex-direction: column;
	}
}
</style>
