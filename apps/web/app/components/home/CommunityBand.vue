<script setup lang="ts">
import { Button } from '@bx-team/ui';
import discordSvgRaw from '~/assets/external/discord.svg?raw';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';

const { data: contributors } = await useContributors();

const faces = computed(() => contributors.value.slice(0, 8));

const { t } = useI18n();
const sitePath = useSitePath();
const ways = [
  { n: '01', id: 'help' },
  { n: '02', id: 'releases' },
  { n: '03', id: 'shape' },
];
</script>

<template>
	<section class="community" aria-labelledby="community-title">
		<div class="community__top">
			<div class="community__text">
				<span class="community__eyebrow">{{ t('home.community.eyebrow') }}</span>
				<h2 id="community-title" class="community__title">
					{{ t('home.community.title') }} <span class="bx-text-grad">{{ t('home.community.titleGrad') }}</span>
				</h2>
				<p class="community__lede">{{ t('home.community.lede') }}</p>
				<div class="community__cta">
					<Button variant="primary" size="lg" :href="DISCORD_URL">
						<span class="community__icon" v-html="discordSvgRaw" />
						{{ t('home.discord') }}
					</Button>
					<Button variant="secondary" size="lg" :href="GITHUB_URL">
						<HomeGithubMark :size="16" />
						{{ t('home.community.github') }}
					</Button>
				</div>
			</div>

			<NuxtLink v-if="faces.length" :to="sitePath('/team')" class="community__people">
				<span class="community__faces">
					<img
						v-for="c in faces"
						:key="c.login"
						:src="`${c.avatar_url}&s=64`"
						:alt="c.login"
						width="32"
						height="32"
						loading="lazy"
					/>
				</span>
				<span class="community__count">
					<b>{{ contributors.length }}</b>
					{{ t('home.community.contributors', contributors.length) }} →
				</span>
			</NuxtLink>
		</div>

		<ul class="community__ways">
			<li v-for="w in ways" :key="w.n" class="community__way">
				<span class="community__way-head">
					<span class="community__num">{{ w.n }}</span>
					<span class="community__way-title">{{ t(`home.community.ways.${w.id}.title`) }}</span>
				</span>
				<span class="community__way-body">{{ t(`home.community.ways.${w.id}.body`) }}</span>
			</li>
		</ul>
	</section>
</template>

<style scoped>
.community {
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background:
		radial-gradient(60% 120% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%),
		radial-gradient(50% 120% at 100% 0%, color-mix(in srgb, var(--accent-2) 10%, transparent), transparent 60%),
		var(--surface-card);
}

.community__top {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 28px;
	padding: clamp(24px, 4vw, 44px);
}

.community__text {
	flex: 1 1 460px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 14px;
}

.community__eyebrow {
	font: 500 12px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--accent-2);
}

.community__title {
	margin: 0;
	font: 800 clamp(28px, 3.4vw, 40px) / 1.05 var(--font-sans);
	letter-spacing: -0.04em;
	color: var(--fg);
}

.community__lede {
	margin: 0;
	max-width: 56ch;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
}

.community__cta {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-top: 6px;
}

.community__icon {
	display: inline-flex;
	line-height: 0;
}

.community__icon :deep(svg) {
	width: 16px;
	height: 16px;
}

.community__people {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px 18px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-1);
	transition: border-color 0.15s ease;
}

.community__people:hover {
	border-color: var(--rule);
}

.community__faces {
	display: flex;
	padding-left: 8px;
}

.community__faces img {
	width: 32px;
	height: 32px;
	margin-left: -8px;
	border: 2px solid var(--surface-1);
	border-radius: 50%;
}

.community__count {
	display: flex;
	align-items: baseline;
	gap: 10px;
	font: 400 13px/1.4 var(--font-sans);
	color: var(--mute);
}

.community__count b {
	font: 800 28px/1 var(--font-sans);
	letter-spacing: -0.03em;
	color: var(--fg);
}

.community__ways {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 1px;
	margin: 0;
	padding: 0;
	list-style: none;
	border-top: 1px solid var(--line);
	background: var(--line);
}

.community__way {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 22px clamp(20px, 3vw, 28px);
	background: var(--surface-0);
}

.community__way-head {
	display: flex;
	align-items: center;
	gap: 10px;
}

.community__num {
	display: grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: var(--r-2);
	background: var(--accent-wash);
	color: var(--accent-2);
	font: 600 12px/1 var(--font-mono);
}

.community__way-title {
	font: 700 15px/1.3 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg);
}

.community__way-body {
	font: 400 13px/1.55 var(--font-sans);
	color: var(--mute);
}

@media (max-width: 640px) {
	.community__cta {
		flex-direction: column;
		align-items: stretch;
		width: 100%;
	}
}
</style>
