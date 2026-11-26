<script setup lang="ts">
import { ArrowRight, Check, Copy, Download, Fingerprint, Map as MapIcon, Palette, Terminal } from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { downloadSkill, MARKETPLACE, PLUGIN, REPOSITORY, SKILLS } from '@/lib/skills';

const { t } = useI18n();
const sitePath = useSitePath();

useHead({
  title: () => t('tools.index.name'),
  meta: [{ name: 'description', content: () => t('tools.index.description') }],
});

/** Names are `tools.<key>.name`, lines `tools.index.cards.<key>`. */
const tools = [
  { key: 'flags', to: '/tools/server-flags-generator', icon: Terminal },
  { key: 'color', to: '/tools/color-text-generator', icon: Palette },
  { key: 'uuid', to: '/tools/uuid', icon: Fingerprint },
  { key: 'coords', to: '/tools/coordinate-calculator', icon: MapIcon },
];

const commands = {
  claudeCode: `/plugin install ${PLUGIN} --marketplace ${MARKETPLACE}`,
  older: `/plugin marketplace add ${MARKETPLACE}\n/plugin install ${PLUGIN}@bx-team`,
};

const { copy, copied, text: copiedText } = useClipboard({ legacy: true });
</script>

<template>
	<ToolsToolPage :title="$t('tools.index.name')" :lead="$t('tools.index.lead')" :crumb="false">
		<div class="tools">
			<NuxtLink v-for="tool in tools" :key="tool.to" :to="sitePath(tool.to)" class="tools__card">
				<span class="tools__icon"><component :is="tool.icon" :size="18" :stroke-width="1.7" /></span>
				<h2>{{ $t(`tools.${tool.key}.name`) }}</h2>
				<p>{{ $t(`tools.index.cards.${tool.key}`) }}</p>
				<span class="tools__go">{{ $t('tools.index.open') }} <ArrowRight :size="14" :stroke-width="1.8" /></span>
			</NuxtLink>
		</div>

		<section id="skills" class="section">
			<h2>{{ $t('tools.index.skills') }}</h2>
			<p class="section-lead">{{ $t('tools.index.skillsLede') }}</p>

			<div class="skills">
				<div class="skills__list">
					<article v-for="s in SKILLS" :key="s.name" class="panel skill">
						<header class="skill__head">
							<h3>{{ $t(`tools.skillList.${s.name}.title`) }}</h3>
							<code>{{ s.name }}</code>
						</header>
						<p>{{ $t(`tools.skillList.${s.name}.body`) }}</p>
						<div class="skill__acts">
							<button type="button" class="btn" @click="downloadSkill(s.name)">
								<Download :size="15" :stroke-width="1.8" /> {{ s.name }}.zip
							</button>
							<NuxtLink v-if="s.tool" :to="sitePath(s.tool.to)" class="skill__tool">{{ $t(`tools.${s.tool.key}.name`) }} →</NuxtLink>
						</div>
					</article>
				</div>

				<div class="panel install">
					<div class="install__step">
						<span class="label">Claude Code</span>
						<p>{{ $t('tools.index.claudeCode') }}</p>
						<div class="cmd">
							<code>{{ commands.claudeCode }}</code>
							<button
								type="button"
								class="cmd__copy"
								:aria-label="$t('tools.index.copyInstall')"
								@click="copy(commands.claudeCode)"
							>
								<component :is="copied && copiedText === commands.claudeCode ? Check : Copy" :size="15" />
							</button>
						</div>
						<p class="hint">{{ $t('tools.index.older') }}</p>
						<div class="cmd">
							<code>{{ commands.older }}</code>
							<button type="button" class="cmd__copy" :aria-label="$t('tools.index.copyBoth')" @click="copy(commands.older)">
								<component :is="copied && copiedText === commands.older ? Check : Copy" :size="15" />
							</button>
						</div>
					</div>
					<div class="install__step">
						<span class="label">{{ $t('tools.index.apps') }}</span>
						<i18n-t keypath="tools.index.appsBody" tag="p" scope="global">
							<template #customize>
								<a href="https://claude.ai/customize/skills" target="_blank" rel="noopener">{{ $t('tools.index.customize') }}</a>
							</template>
							<template #create><em>{{ $t('tools.index.create') }}</em></template>
						</i18n-t>
					</div>
					<i18n-t keypath="tools.index.repo" tag="p" class="hint" scope="global">
						<template #repo>
							<a :href="`https://github.com/${REPOSITORY}`" target="_blank" rel="noopener">{{ REPOSITORY }}</a>
						</template>
					</i18n-t>
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
