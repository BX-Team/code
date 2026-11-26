<script setup lang="ts">
import { Check, Copy, Download, ExternalLink } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { diagnose } from '@/lib/flags/diagnose';
import type { Arch, Env, Graal, Os } from '@/lib/flags/env';
import { highlight } from '@/lib/flags/highlight';
import { formatMemMB, parseMemMB } from '@/lib/flags/mem';
import { getPreset, PRESETS } from '@/lib/flags/presets';
import { batchScript, flagsOnly, type LaunchOptions, launchArgs, shellScript } from '@/lib/flags/script';
import { syncQuery } from '@/lib/query';

const { t } = useI18n();

useHead({
  title: () => t('tools.flags.name'),
  meta: [{ name: 'description', content: () => t('tools.flags.description') }],
});

const route = useRoute();
const query = route.query;
const asText = (key: string, fallback: string) => (typeof query[key] === 'string' ? (query[key] as string) : fallback);

const MIN_MB = 1024;
const MAX_MB = 64 * 1024;
const TICKS = [2, 4, 6, 8, 12, 16, 24, 32].map(g => g * 1024);

const heapMB = ref(Math.min(Math.max(parseMemMB(asText('heap', '6G')) ?? 6144, MIN_MB), MAX_MB));
const xmsLocked = ref(asText('xms', '') === '');
const xmsInput = ref(asText('xms', '2G'));
const presetId = ref(asText('preset', 'aikar'));
const java = ref(asText('java', '25'));
const graal = ref<Graal>(asText('graal', 'none') as Graal);
const os = ref<Os>(asText('os', 'linux') as Os);
const arch = ref<Arch>(asText('arch', 'x86_64') as Arch);
const jar = ref(asText('jar', 'server.jar'));
const proxy = ref(asText('proxy', '') === '1');
const restart = ref(asText('restart', '') === '1');

const xmsMB = computed(() => (xmsLocked.value ? heapMB.value : (parseMemMB(xmsInput.value) ?? heapMB.value)));

const env = computed<Env>(() => ({
  heapMB: heapMB.value,
  java: Number.parseInt(java.value, 10),
  graal: graal.value,
  os: os.value,
  arch: arch.value,
}));

const options = computed<LaunchOptions>(() => ({
  env: env.value,
  presetId: presetId.value,
  xmsMB: xmsMB.value,
  jar: jar.value.trim() || 'server.jar',
  proxy: proxy.value,
  extra: [],
  restartOnExit: restart.value,
}));

const preset = computed(() => getPreset(presetId.value));
const presetFlags = computed(() => preset.value.flags(env.value));
const argCount = computed(() => launchArgs(options.value).length);
const notices = computed(() => diagnose(env.value, preset.value, presetFlags.value));

type Output = 'sh' | 'bat' | 'flags';
/** Tab names are `tools.flags.outputs.<id>`. */
const OUTPUTS: { id: Output; file: string | null }[] = [
  { id: 'sh', file: 'start.sh' },
  { id: 'bat', file: 'start.bat' },
  { id: 'flags', file: null },
];
const output = ref<Output>(os.value === 'windows' ? 'bat' : 'sh');
// The script follows the host, unless someone picked the panel line on purpose.
watch(os, value => {
  if (output.value !== 'flags') output.value = value === 'windows' ? 'bat' : 'sh';
});

const code = computed(() => {
  switch (output.value) {
    case 'sh':
      return shellScript(options.value);
    case 'bat':
      return batchScript(options.value);
    case 'flags':
      return `${flagsOnly(options.value)}\n`;
  }
});
const lines = computed(() => highlight(code.value));
const current = computed(() => OUTPUTS.find(o => o.id === output.value));

const copied = ref(false);
async function copy() {
  await navigator.clipboard.writeText(code.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1600);
}

function download() {
  const file = current.value?.file;
  if (!file) return;
  const url = URL.createObjectURL(new Blob([code.value], { type: 'text/plain' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url));
}

const fill = computed(() => `${((heapMB.value - MIN_MB) / (MAX_MB - MIN_MB)) * 100}%`);

/** The whole form lives in the URL so a generated set can be pasted into a support thread. */
watch(
  [heapMB, xmsLocked, xmsInput, presetId, java, graal, os, arch, jar, proxy, restart],
  () => {
    syncQuery({
      heap: formatMemMB(heapMB.value),
      xms: xmsLocked.value ? undefined : xmsInput.value,
      preset: presetId.value,
      java: java.value,
      graal: graal.value === 'none' ? undefined : graal.value,
      os: os.value,
      arch: arch.value,
      jar: jar.value === 'server.jar' ? undefined : jar.value,
      proxy: proxy.value ? '1' : undefined,
      restart: restart.value ? '1' : undefined,
    });
  },
  { flush: 'post' },
);
</script>

<template>
	<ToolsToolPage
		:title="t('tools.flags.name')"
		:lead="t('tools.flags.lead')"
	>
		<div class="fg">
			<div class="fg__row">
				<section class="panel fg__card">
					<h2>{{ t('tools.flags.serverFile') }}</h2>
					<label class="field">
						<input v-model="jar" class="input" placeholder="server.jar" spellcheck="false" />
						<span class="hint">{{ t('tools.flags.serverFileHint') }}</span>
					</label>
				</section>

				<section class="panel fg__card">
					<h2>{{ t('tools.flags.options') }}</h2>
					<div class="fg__checks">
						<label class="check">
							<input v-model="restart" type="checkbox" />
							<span><b>{{ t('tools.flags.restart') }}</b> {{ t('tools.flags.restartHint') }}</span>
						</label>
						<label class="check">
							<input v-model="proxy" type="checkbox" />
							<span>
								<b>{{ t('tools.flags.proxy') }}</b>
								<i18n-t keypath="tools.flags.proxyHint" scope="global"><template #flag><code>--nogui</code></template></i18n-t>
							</span>
						</label>
						<label class="check">
							<input v-model="xmsLocked" type="checkbox" />
							<span>
								<b>{{ t('tools.flags.fixedHeap') }}</b>
								<i18n-t keypath="tools.flags.fixedHeapHint" scope="global">
									<template #flags><code>-Xms</code> = <code>-Xmx</code></template>
								</i18n-t>
							</span>
						</label>
						<label v-if="!xmsLocked" class="field fg__xms">
							<span class="label">{{ t('tools.flags.initialHeap') }}</span>
							<input v-model="xmsInput" class="input" placeholder="2G" />
						</label>
					</div>
				</section>
			</div>

			<section class="panel fg__card">
				<h2>{{ t('tools.flags.flagSet') }}</h2>
				<div class="fg__presets" role="radiogroup" :aria-label="t('tools.flags.flagSet')">
					<div v-for="p in PRESETS" :key="p.id" class="fg__preset" :class="{ on: presetId === p.id }">
						<button type="button" role="radio" :aria-checked="presetId === p.id" @click="presetId = p.id">
							{{ p.name }}
						</button>
						<p>
							{{ t(`notices.presets.${p.id}`) }}.
							<a v-if="p.url" :href="p.url" target="_blank" rel="noopener">
								{{ t('tools.flags.by', { author: p.author }) }} <ExternalLink :size="11" />
							</a>
						</p>
					</div>
				</div>
			</section>

			<div class="fg__row">
				<section class="panel fg__card">
					<h2>
						{{ t('tools.flags.memory') }} <code class="fg__mem">{{ formatMemMB(heapMB) }}</code>
					</h2>
					<input
						v-model.number="heapMB"
						type="range"
						class="fg__slider"
						:min="MIN_MB"
						:max="MAX_MB"
						:step="512"
						:style="{ '--fill': fill }"
						:aria-label="t('tools.flags.maxHeap')"
					/>
					<div class="fg__ticks">
						<button
							v-for="tick in TICKS"
							:key="tick"
							type="button"
							class="chip"
							:class="{ on: heapMB === tick }"
							@click="heapMB = tick"
						>
							{{ formatMemMB(tick) }}
						</button>
					</div>
					<p class="hint">{{ t('tools.flags.memoryHint') }}</p>
				</section>

				<section class="panel fg__card">
					<h2>{{ t('tools.flags.host') }}</h2>
					<div class="fg__env">
						<ToolsSegmentedControl
							v-model="java"
							label="Java"
							:options="[
								{ value: '17', label: '17' },
								{ value: '21', label: '21' },
								{ value: '25', label: '25' },
							]"
						/>
						<ToolsSegmentedControl
							v-model="graal"
							label="JVM"
							:options="[
								{ value: 'none', label: t('tools.flags.anyJdk') },
								{ value: 'oracle', label: 'GraalVM' },
							]"
						/>
						<ToolsSegmentedControl
							v-model="os"
							:label="t('tools.flags.system')"
							:options="[
								{ value: 'linux', label: 'Linux' },
								{ value: 'windows', label: 'Windows' },
								{ value: 'macos', label: 'macOS' },
							]"
						/>
						<ToolsSegmentedControl
							v-model="arch"
							label="CPU"
							:options="[
								{ value: 'x86_64', label: 'x86_64' },
								{ value: 'aarch64', label: 'ARM64' },
							]"
						/>
					</div>
				</section>
			</div>

			<section class="panel fg__card fg__result">
				<header class="fg__result-head">
					<h2>{{ t('tools.flags.result') }}</h2>
					<div class="fg__tabs" role="tablist" :aria-label="t('tools.flags.output')">
						<button
							v-for="o in OUTPUTS"
							:key="o.id"
							type="button"
							role="tab"
							:aria-selected="output === o.id"
							:class="{ on: output === o.id }"
							@click="output = o.id"
						>
							{{ t(`tools.flags.outputs.${o.id}`) }}
						</button>
					</div>
				</header>

				<div class="fg__code">
					<button type="button" class="fg__copy" :aria-label="copied ? t('common.copied') : t('common.copy')" @click="copy">
						<component :is="copied ? Check : Copy" :size="15" />
					</button>
					<pre><code><span v-for="(line, i) in lines" :key="i" class="fg__line"><span class="fg__ln">{{ i + 1 }}</span><span class="fg__text"><span v-for="(token, j) in line" :key="j" :class="`t-${token.kind}`">{{ token.text }}</span></span>
</span></code></pre>
				</div>

				<footer class="fg__result-foot">
					<span class="hint">{{ t('tools.flags.count', { flags: t('tools.flags.flags', presetFlags.length), args: t('tools.flags.args', argCount) }) }}</span>
					<button v-if="current?.file" type="button" class="btn primary" @click="download">
						<Download :size="15" /> {{ current.file }}
					</button>
					<button v-else type="button" class="btn primary" @click="copy">
						<component :is="copied ? Check : Copy" :size="15" /> {{ copied ? t('common.copied') : t('tools.flags.copyFlags') }}
					</button>
				</footer>

				<ToolsNoticeList v-if="notices.length" :notices="notices" columns class="fg__notes" />
			</section>
		</div>
	</ToolsToolPage>
</template>

<style scoped>
.fg {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.fg__row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
	gap: 16px;
}

.fg__card {
	display: flex;
	flex-direction: column;
	gap: 14px;
	min-width: 0;
}

.fg__card h2 {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 0;
	font: 700 16px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.fg__checks {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 6px 20px;
	align-items: start;
}

.fg__checks .check {
	align-items: flex-start;
	padding: 6px 0;
}

.fg__checks .check input {
	margin-top: 3px;
	flex: none;
}

.fg__checks .check code {
	white-space: nowrap;
}

.fg__checks .check b {
	display: block;
	font-weight: 600;
	color: var(--fg-hi);
}

.fg__presets {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 10px;
}

.fg__preset {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.fg__preset button {
	min-height: 56px;
	padding: 8px 12px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-3);
	background: transparent;
	color: var(--dim);
	font: 600 13.5px/1.3 var(--font-sans);
	cursor: pointer;
	transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.fg__preset button:hover {
	background: var(--surface-2);
	color: var(--fg-hi);
}

.fg__preset.on button {
	border-color: var(--fg-hi);
	background: var(--fg-hi);
	color: var(--surface-deep);
}

.fg__preset p {
	margin: 0;
	padding: 0 4px;
	font: 400 12px/1.5 var(--font-sans);
	color: var(--mute);
}

.fg__preset a {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	color: var(--accent);
}

.fg__mem {
	padding: 3px 8px;
	border-radius: var(--r-1);
	background: var(--surface-3);
	font: 600 14px/1 var(--font-mono);
	color: var(--accent);
}

.fg__slider {
	width: 100%;
	height: 24px;
	margin: 4px 0 0;
	appearance: none;
	background: transparent;
	cursor: pointer;
}

.fg__slider::-webkit-slider-runnable-track {
	height: 6px;
	border-radius: 3px;
	background: linear-gradient(90deg, var(--accent), var(--accent-2)) 0 / var(--fill) 100% no-repeat, var(--surface-3);
}

.fg__slider::-moz-range-track {
	height: 6px;
	border-radius: 3px;
	background: linear-gradient(90deg, var(--accent), var(--accent-2)) 0 / var(--fill) 100% no-repeat, var(--surface-3);
}

.fg__slider::-webkit-slider-thumb {
	width: 20px;
	height: 20px;
	margin-top: -7px;
	border: 3px solid var(--surface-card);
	border-radius: 50%;
	background: var(--fg-hi);
	appearance: none;
}

.fg__slider::-moz-range-thumb {
	width: 14px;
	height: 14px;
	border: 3px solid var(--surface-card);
	border-radius: 50%;
	background: var(--fg-hi);
}

.fg__ticks {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 4px;
}

.fg__ticks .chip {
	min-height: 36px;
}

.fg__env {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px 16px;
}

.fg__result-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.fg__tabs {
	display: flex;
	gap: 2px;
	padding: 3px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-1);
}

.fg__tabs button {
	min-height: 36px;
	padding: 0 14px;
	border: 0;
	border-radius: var(--r-1);
	background: transparent;
	color: var(--mute);
	font: 500 13px/1 var(--font-sans);
	cursor: pointer;
}

.fg__tabs button:hover {
	color: var(--fg-hi);
}

.fg__tabs button.on {
	background: var(--surface-3);
	color: var(--fg-hi);
}

.fg__code {
	position: relative;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-deep);
}

.fg__code pre {
	max-height: 520px;
	margin: 0;
	padding: 16px 56px 16px 0;
	overflow: auto;
	font: 400 13px/1.7 var(--font-mono);
	color: var(--fg);
}

.fg__line {
	display: flex;
}

.fg__ln {
	flex: none;
	width: 4ch;
	margin-right: 2ch;
	text-align: right;
	color: var(--rule);
	user-select: none;
}

.fg__text {
	min-width: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.fg__copy {
	position: absolute;
	top: 8px;
	right: 8px;
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: var(--surface-card);
	color: var(--mute);
	cursor: pointer;
}

.fg__copy:hover {
	color: var(--fg-hi);
}

.t-java,
.t-jar {
	color: var(--accent-2);
	font-weight: 600;
}

.t-heap {
	color: var(--warn);
}

.t-flag {
	color: var(--accent);
}

.t-value {
	color: var(--accent-2);
}

.t-prop,
.t-muted {
	color: var(--mute);
}

.t-keyword {
	color: var(--exp);
}

.t-comment {
	color: var(--mute);
	font-style: italic;
}

.fg__result-foot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 10px 16px;
}

.fg__notes {
	margin-top: 4px;
}

@media (max-width: 900px) {
	.fg__row {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (max-width: 520px) {
	.fg__env {
		grid-template-columns: minmax(0, 1fr);
	}

	.fg__tabs {
		width: 100%;
	}

	.fg__tabs button {
		flex: 1;
		padding: 0 8px;
	}
}
</style>
