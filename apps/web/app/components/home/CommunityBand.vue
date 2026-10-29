<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { DISCORD_URL, GITHUB_URL } from '~/config/links';

const { data: contributors } = await useContributors();

const faces = computed(() => contributors.value.slice(0, 8));

const ways = [
  { n: '01', title: 'Get help fast', body: 'Ask in Discord — the people who write the code answer there.' },
  {
    n: '02',
    title: 'Hear about releases first',
    body: "Every publish is announced in its project's thread the moment it lands.",
  },
  { n: '03', title: 'Shape what comes next', body: 'Suggest features, report bugs and send pull requests on GitHub.' },
];
</script>

<template>
	<section class="community">
		<div class="community__panel">
			<div class="community__text">
				<span class="community__eyebrow">Community</span>
				<h2 class="community__title">Build it with us</h2>
				<p class="community__lede">
					Ask questions, hear about releases first, share what you run and help shape what comes next. Everything we
					make is open, and so is the conversation around it.
				</p>
				<div class="community__cta">
					<Button variant="primary" size="lg" :href="DISCORD_URL">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
						</svg>
						Join our Discord
					</Button>
					<Button variant="secondary" size="lg" :href="GITHUB_URL">
						<HomeGithubMark :size="17" />
						Contribute on GitHub
					</Button>
				</div>
			</div>

			<div class="community__side">
				<ul class="community__ways">
					<li v-for="w in ways" :key="w.n" class="community__way">
						<span class="community__num">{{ w.n }}</span>
						<span class="community__way-text">
							<span class="community__way-title">{{ w.title }}</span>
							<span class="community__way-body">{{ w.body }}</span>
						</span>
					</li>
				</ul>

				<div v-if="faces.length" class="community__people">
					<div class="community__faces">
						<a
							v-for="c in faces"
							:key="c.login"
							:href="c.html_url"
							:title="c.login"
							target="_blank"
							rel="noopener noreferrer"
							class="community__face"
						>
							<img :src="`${c.avatar_url}&s=64`" :alt="c.login" width="30" height="30" loading="lazy" />
						</a>
					</div>
					<NuxtLink to="/team" class="community__count">
						{{ contributors.length }} contributors on GitHub
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.community {
	padding: 0 var(--s-8) var(--s-24);
}

.community__panel {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-10);
	max-width: var(--container);
	margin: 0 auto;
	box-sizing: border-box;
	padding: var(--s-10);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background:
		radial-gradient(80% 120% at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%),
		radial-gradient(70% 120% at 100% 100%, color-mix(in srgb, var(--accent-2) 9%, transparent), transparent 60%),
		var(--surface-deep);
}

.community__text {
	flex: 1 1 380px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 14px;
}

.community__eyebrow {
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--accent-2);
}

.community__title {
	margin: 0;
	font: 800 34px/1.1 var(--font-sans);
	letter-spacing: -0.025em;
	color: var(--fg);
}

.community__lede {
	margin: 0;
	max-width: 52ch;
	font: 400 16px/1.6 var(--font-sans);
	color: var(--dim);
	text-wrap: pretty;
}

.community__cta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-3);
	margin-top: var(--s-2);
}

.community__side {
	flex: 1 1 320px;
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
}

.community__ways {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.community__way {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	padding: var(--s-4);
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: color-mix(in srgb, var(--surface-1) 70%, transparent);
}

.community__num {
	flex: none;
	display: grid;
	place-items: center;
	width: 34px;
	height: 34px;
	border-radius: var(--r-2);
	background: var(--accent-wash);
	color: var(--accent-2);
	font: 600 12px/1 var(--font-mono);
}

.community__way-text {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.community__way-title {
	font: 600 15px/1.4 var(--font-sans);
	color: var(--fg);
}

.community__way-body {
	font: 400 13.5px/1.5 var(--font-sans);
	color: var(--mute);
}

.community__people {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--s-3);
	padding: var(--s-2) var(--s-1) 0;
}

.community__faces {
	display: flex;
	padding-left: 8px;
}

.community__face {
	display: block;
	margin-left: -8px;
	border: 2px solid var(--surface-deep);
	border-radius: 50%;
	overflow: hidden;
	transition: transform 0.15s ease;
}

.community__face:hover {
	transform: translateY(-2px);
}

.community__face img {
	display: block;
	width: 30px;
	height: 30px;
}

.community__count {
	font: 400 13px/1.4 var(--font-sans);
	color: var(--mute);
	transition: color 0.15s ease;
}

.community__count:hover {
	color: var(--accent);
}

@media (max-width: 640px) {
	.community {
		padding: 0 var(--s-4) var(--s-16);
	}

	.community__panel {
		padding: var(--s-6);
		gap: var(--s-8);
	}

	.community__title {
		font-size: 28px;
	}

	.community__cta {
		flex-direction: column;
		align-items: stretch;
		width: 100%;
	}
}
</style>
