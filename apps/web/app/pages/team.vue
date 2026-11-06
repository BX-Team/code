<script setup lang="ts">
import { Button, PageHero, Section } from '@bx-team/ui';
import { GITHUB_URL } from '~/config/links';

interface TeamMember {
  name: string;
  role: string;
  github?: string;
}

interface TeamSection {
  title: string;
  description: string;
  members: TeamMember[];
}

const sections: TeamSection[] = [
  {
    title: 'Leadership Team',
    description: 'The main team that leads the projects and makes strategic decisions.',
    members: [
      { name: 'NONPLAYT', github: 'NONPLAYT', role: 'Founder' },
      { name: 'wiyba', github: 'wiyba', role: 'Developer & Designer' },
      { name: 'Thoutpinqq', github: 'VladKekes', role: 'Co-Founder' },
    ],
  },
  {
    title: 'Other members',
    description: 'The team responsible for the moderation and management of the projects.',
    members: [
      { name: 'ROUMAY', role: 'Discord Moderator' },
      { name: 'p4ts4k', github: 'P4TS4KK', role: 'Process Manager' },
    ],
  },
];

const { data: contributors } = await useContributors();

useHead({
  title: 'Team',
  meta: [{ name: 'description', content: 'Meet the BX Team developers and contributors.' }],
});
</script>

<template>
	<PageShell>
		<main>
			<PageHero
				title="Meet our team"
				lede="BX Team is a group of developers and contributors who work together to maintain and improve the BX Team projects."
			>
				<template #cta>
					<Button :href="GITHUB_URL" target="_blank" rel="noopener noreferrer" variant="primary" size="lg">
						<img src="~/assets/external/github.svg" width="16" height="16" alt="" aria-hidden="true" />
						Visit our GitHub
					</Button>
				</template>
			</PageHero>

			<Section v-for="s in sections" :key="s.title" :title="s.title" :lede="s.description">
				<div class="team__grid">
					<template v-for="m in s.members" :key="m.name">
						<component
							:is="m.github ? 'a' : 'div'"
							:href="m.github ? `https://github.com/${m.github}` : undefined"
							:target="m.github ? '_blank' : undefined"
							:rel="m.github ? 'noopener noreferrer' : undefined"
							class="team__member"
						>
							<span class="team__avatar">
								<img v-if="m.github" :src="`https://github.com/${m.github}.png`" :alt="`${m.name} avatar`" />
								<span v-else>{{ m.name[0] }}</span>
							</span>
							<span class="team__who">
								<h3>{{ m.name }}</h3>
								<p>{{ m.role }}</p>
							</span>
						</component>
					</template>
				</div>
			</Section>

			<Section
				title="Contributors"
				:lede="`${contributors.length} people who have committed to our repositories and make BX Team projects better.`"
			>
				<div class="team__contributors">
					<a
						v-for="c in contributors"
						:key="c.login"
						:href="c.html_url"
						:title="c.login"
						target="_blank"
						rel="noopener noreferrer"
						class="team__contrib"
					>
						<img :src="c.avatar_url" :alt="`${c.login} GitHub avatar`" />
					</a>
				</div>
			</Section>
		</main>
	</PageShell>
</template>

<style scoped>
.team__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: var(--s-4);
}

.team__member {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: var(--s-5);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	color: inherit;
	transition: background-color 0.15s ease;
}

a.team__member:hover {
	background: var(--surface-2);
}

.team__avatar {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	width: 44px;
	height: 44px;
	overflow: hidden;
	border-radius: 50%;
	background: var(--surface-3);
	font: 700 15px var(--font-sans);
	color: var(--fg-hi);
}

.team__avatar img,
.team__contrib img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.team__who h3 {
	margin: 0 0 2px;
	font: 700 16px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg);
}

.team__who p {
	margin: 0;
	font: 400 13px/1.4 var(--font-sans);
	color: var(--mute);
}

.team__contributors {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-3);
	padding: var(--s-5);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
}

.team__contrib {
	width: 52px;
	height: 52px;
	overflow: hidden;
	border: 2px solid var(--line);
	border-radius: 50%;
	transition: border-color 0.15s ease;
}

.team__contrib:hover {
	border-color: var(--accent);
}
</style>
