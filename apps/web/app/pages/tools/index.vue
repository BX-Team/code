<script setup lang="ts">
import { ArrowRight, Check, Copy, Download, Fingerprint, Map as MapIcon, Palette, Terminal } from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { downloadSkill, MARKETPLACE, PLUGIN, REPOSITORY, SKILLS } from '@/lib/skills';

useHead({
  title: 'Tools',
  meta: [
    { name: 'description', content: 'Small utilities for Minecraft servers, and Claude skills that know our stack.' },
  ],
});

const tools = [
  {
    to: '/tools/server-flags-generator',
    icon: Terminal,
    name: 'Server flags generator',
    body: "Aikar's, MeowIce, brucethemoose and hilltty, for your heap, Java, OS and CPU.",
  },
  {
    to: '/tools/color-text-generator',
    icon: Palette,
    name: 'Color text generator',
    body: 'Gradients and colours for chat, MOTDs and plugin configs, as MiniMessage, hex or legacy codes.',
  },
  {
    to: '/tools/uuid',
    icon: Fingerprint,
    name: 'UUID lookup',
    body: 'The online UUID of an account and the offline one a cracked server derives from the name, with the skin.',
  },
  {
    to: '/tools/coordinate-calculator',
    icon: MapIcon,
    name: 'Coordinate calculator',
    body: 'Nether and Overworld coordinates for linking portals, and a stronghold from two Eye of Ender throws.',
  },
];

const commands = {
  claudeCode: `/plugin install ${PLUGIN} --marketplace ${MARKETPLACE}`,
  older: `/plugin marketplace add ${MARKETPLACE}\n/plugin install ${PLUGIN}@bx-team`,
};

const { copy, copied, text: copiedText } = useClipboard({ legacy: true });
</script>

<template>
	<ToolsToolPage
		title="Tools"
		lead="Small utilities for running a Minecraft server. Everything runs in your browser and nothing is uploaded."
		:crumb="false"
	>
		<div class="tools">
			<NuxtLink v-for="t in tools" :key="t.to" :to="t.to" class="tools__card">
				<span class="tools__icon"><component :is="t.icon" :size="18" :stroke-width="1.7" /></span>
				<h2>{{ t.name }}</h2>
				<p>{{ t.body }}</p>
				<span class="tools__go">Open <ArrowRight :size="14" :stroke-width="1.8" /></span>
			</NuxtLink>
		</div>

		<section id="skills" class="section">
			<h2>Skills for Claude</h2>
			<p class="section-lead">
				The same knowledge, for when you would rather ask than fill in a form. Claude asks about your host, explains
				its choices and reviews what you already run.
			</p>

			<div class="skills">
				<div class="skills__list">
					<article v-for="s in SKILLS" :key="s.name" class="panel skill">
						<header class="skill__head">
							<h3>{{ s.title }}</h3>
							<code>{{ s.name }}</code>
						</header>
						<p>{{ s.body }}</p>
						<div class="skill__acts">
							<button type="button" class="btn" @click="downloadSkill(s.name)">
								<Download :size="15" :stroke-width="1.8" /> {{ s.name }}.zip
							</button>
							<NuxtLink v-if="s.tool" :to="s.tool.to" class="skill__tool">{{ s.tool.label }} →</NuxtLink>
						</div>
					</article>
				</div>

				<div class="panel install">
					<div class="install__step">
						<span class="label">Claude Code</span>
						<p>Both skills come as one plugin. Run this in Claude Code; it updates with the repository.</p>
						<div class="cmd">
							<code>{{ commands.claudeCode }}</code>
							<button
								type="button"
								class="cmd__copy"
								aria-label="Copy the install command"
								@click="copy(commands.claudeCode)"
							>
								<component :is="copied && copiedText === commands.claudeCode ? Check : Copy" :size="15" />
							</button>
						</div>
						<p class="hint">On an older Claude Code, add the marketplace first:</p>
						<div class="cmd">
							<code>{{ commands.older }}</code>
							<button type="button" class="cmd__copy" aria-label="Copy both commands" @click="copy(commands.older)">
								<component :is="copied && copiedText === commands.older ? Check : Copy" :size="15" />
							</button>
						</div>
					</div>
					<div class="install__step">
						<span class="label">Claude apps</span>
						<p>
							Download a skill's zip, then in Claude open
							<a href="https://claude.ai/customize/skills" target="_blank" rel="noopener">Customize → Skills</a>, choose
							<em>Create skill</em> and upload it.
						</p>
					</div>
					<p class="hint">
						The skills live in
						<a :href="`https://github.com/${REPOSITORY}`" target="_blank" rel="noopener">{{ REPOSITORY }}</a>, along with
						the ones we use to drive and record desktop apps.
					</p>
				</div>
			</div>
		</section>
	</ToolsToolPage>
</template>

<style scoped>
.tools {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
	gap: 12px;
}

.tools__card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: var(--s-6);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	color: var(--fg);
	transition: background-color 0.15s ease;
}

.tools__card:hover {
	background: var(--surface-2);
}

.tools__icon {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border: 1px solid var(--line-2);
	border-radius: 9px;
	background: var(--surface-3);
	color: var(--accent);
}

.tools__card h2 {
	margin: 6px 0 0;
	font: 700 17px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.tools__card p {
	flex: 1;
	margin: 0;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--dim);
}

.tools__go {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 13.5px/1 var(--font-sans);
	color: var(--accent);
}

.skills {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 12px;
}

.skills__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.skill {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.skill__head {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 4px 10px;
}

.skill__head h3 {
	margin: 0;
	font: 700 17px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.skill__head code {
	font: 400 12px/1 var(--font-mono);
	color: var(--mute);
}

.skill p {
	margin: 0;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--dim);
}

.skill__acts {
	margin-top: auto;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 16px;
	padding-top: 4px;
}

.skill__tool {
	font: 500 13.5px/1 var(--font-sans);
	color: var(--accent);
}

.install {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.install__step {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.install__step p {
	margin: 0;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--dim);
}

.install__step a {
	color: var(--accent);
}

.cmd {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 6px 6px 6px 14px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-1);
}

.cmd code {
	flex: 1;
	min-width: 0;
	padding: 8px 0;
	font: 400 12.5px/1.6 var(--font-mono);
	color: var(--fg-hi);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.cmd__copy {
	display: grid;
	flex-shrink: 0;
	place-items: center;
	width: 44px;
	height: 44px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: var(--surface-card);
	color: var(--mute);
	cursor: pointer;
}

.cmd__copy:hover {
	color: var(--fg-hi);
}

@media (max-width: 860px) {
	.skills {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
