<script setup lang="ts">
import BrandMark from './BrandMark.vue';

export interface FooterLink {
  label: string;
  href?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const props = withDefaults(
  defineProps<{
    columns?: FooterColumn[];
    blurb?: string;
    status?: string;
    statusHref?: string;
    statusLevel?: 'ok' | 'warn' | 'err';
    githubHref?: string;
    discordHref?: string;
    commit?: { hash: string; message: string };
  }>(),
  {
    columns: () => [
      {
        title: 'BX Team',
        links: [
          { label: 'Documentation', href: '/docs' },
          { label: 'Downloads', href: '/downloads' },
          { label: 'Our team', href: '/team' },
          { label: 'Status', href: '/status' },
        ],
      },
      {
        title: 'Community',
        links: [
          { label: 'Discord', href: 'https://discord.gg/qNyybSSPm5' },
          { label: 'GitHub', href: 'https://github.com/BX-Team' },
          { label: 'Contribute', href: '/contribute' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Terms of use', href: '/legal/terms-of-use' },
          { label: 'Privacy policy', href: '/legal/privacy-policy' },
        ],
      },
    ],
    blurb:
      'BX Team is an open source community building tools and software that empower Minecraft server owners, developers, and players.',
    status: 'All systems normal',
    statusLevel: 'ok',
    githubHref: 'https://github.com/BX-Team',
    discordHref: 'https://discord.gg/qNyybSSPm5',
  },
);
</script>

<template>
	<footer class="bx-footer">
		<div class="bx-footer__inner">
			<div class="bx-footer__top">
				<div class="bx-footer__brand">
					<a href="/" class="bx-footer__brand-row">
						<BrandMark :size="22" />
						<span>BX Team</span>
					</a>
					<p class="bx-footer__blurb">{{ blurb }}</p>
					<div class="bx-footer__socials">
						<a
							:href="githubHref"
							class="bx-footer__social"
							aria-label="GitHub"
							target="_blank"
							rel="noopener noreferrer"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
							</svg>
						</a>
						<a
							:href="discordHref"
							class="bx-footer__social"
							aria-label="Discord"
							target="_blank"
							rel="noopener noreferrer"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.011.043.027.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
								<circle cx="8.5"  cy="13.5" r="1.5" fill="currentColor" stroke="none" />
								<circle cx="15.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
							</svg>
						</a>
					</div>
				</div>

				<div class="bx-footer__cols">
					<div v-for="col in columns" :key="col.title" class="bx-footer__col">
						<h5>{{ col.title }}</h5>
						<ul>
							<li v-for="link in col.links" :key="link.label">
								<a :href="link.href">{{ link.label }}</a>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="bx-footer__bottom">
				<component
					:is="statusHref ? 'a' : 'span'"
					:href="statusHref"
					:target="statusHref ? '_blank' : undefined"
					:rel="statusHref ? 'noopener noreferrer' : undefined"
					class="bx-footer__status"
				>
					<span class="bx-footer__status-dot" :class="statusLevel" />
					{{ status }}
				</component>
				<div class="bx-footer__bottom-right">
					<span v-if="commit" class="bx-footer__commit" :title="commit.message || undefined">
						<code>{{ commit.hash }}</code>
					</span>
					<p class="bx-footer__copy">© 2026 BX Team. Not affiliated with Mojang Studios or Microsoft.</p>
				</div>
			</div>
		</div>
	</footer>
</template>

<style scoped>
.bx-footer {
	margin-top: 60px;
	border-top: 1px solid var(--line);
	background: var(--bg-1);
	padding: 64px 0 28px;
}

.bx-footer__inner {
	max-width: 1180px;
	margin: 0 auto;
	padding: 0 32px;
}

.bx-footer__top {
	display: grid;
	grid-template-columns: 1.4fr 3fr;
	gap: 60px;
	padding-bottom: 48px;
}

.bx-footer__brand-row {
	display: flex;
	align-items: center;
	gap: 10px;
	font: 700 16px var(--font-sans);
	color: var(--fg-hi);
	text-decoration: none;
}

.bx-footer__blurb {
	margin: 14px 0 18px;
	color: var(--dim);
	font-size: 13.5px;
	line-height: 1.55;
	max-width: 36ch;
}

.bx-footer__socials {
	display: flex;
	gap: 8px;
}

.bx-footer__social {
	display: inline-grid;
	place-items: center;
	width: 34px;
	height: 34px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	color: var(--dim);
	transition: color 0.15s, border-color 0.15s;
}

.bx-footer__social:hover {
	color: var(--fg-hi);
	border-color: var(--brand);
}

.bx-footer__cols {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 18px;
}

.bx-footer__col h5 {
	margin: 0 0 12px;
	font: 600 12px var(--font-sans);
	color: var(--fg-hi);
}

.bx-footer__col ul {
	list-style: none;
	padding: 0;
	margin: 0;
}

.bx-footer__col li {
	margin-bottom: 8px;
}

.bx-footer__col a {
	font: 400 13px var(--font-sans);
	color: var(--dim);
	text-decoration: none;
	transition: color 0.15s;
}

.bx-footer__col a:hover {
	color: var(--fg-hi);
}

.bx-footer__bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 24px;
	border-top: 1px solid var(--line);
}

.bx-footer__status {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font: 500 12.5px var(--font-sans);
	color: var(--dim);
}

.bx-footer__status-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 8px var(--ok);
}

.bx-footer__status-dot.warn {
	background: var(--warn);
	box-shadow: 0 0 8px var(--warn);
}

.bx-footer__status-dot.err {
	background: var(--err);
	box-shadow: 0 0 8px var(--err);
}

.bx-footer__status[href] {
	text-decoration: none;
	transition: color 0.15s;
}

.bx-footer__status[href]:hover {
	color: var(--fg-hi);
}

.bx-footer__bottom-right {
	display: flex;
	align-items: center;
	gap: 20px;
}

.bx-footer__commit {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 400 12px var(--font-mono);
	color: var(--mute);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 320px;
}

.bx-footer__commit code {
	font: 600 12px var(--font-mono);
	color: var(--brand);
	background: color-mix(in oklab, var(--brand) 10%, transparent);
	border: 1px solid color-mix(in oklab, var(--brand) 25%, transparent);
	padding: 1px 6px;
	border-radius: 4px;
	flex-shrink: 0;
}

.bx-footer__copy {
	margin: 0;
	color: var(--mute);
	font-size: 12px;
}

@media (max-width: 768px) {
	.bx-footer {
		padding: 48px 0 24px;
	}

	.bx-footer__inner {
		padding: 0 20px;
	}

	.bx-footer__top {
		grid-template-columns: 1fr;
		gap: 36px;
	}

	.bx-footer__blurb {
		max-width: 100%;
	}

	.bx-footer__cols {
		grid-template-columns: repeat(2, 1fr);
	}

	.bx-footer__bottom {
		flex-direction: column;
		gap: 10px;
		align-items: flex-start;
	}

	.bx-footer__bottom-right {
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}

	.bx-footer__commit {
		max-width: 100%;
	}
}

@media (max-width: 400px) {
	.bx-footer__cols {
		grid-template-columns: 1fr;
	}
}
</style>
