<script setup lang="ts">
import { Check, Copy, Minus, Plus, Shuffle } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import {
  type Decorations,
  displayed,
  HEX_PATTERN,
  LEGACY_COLORS,
  type OutputFormat,
  paint,
  render,
} from '@/lib/colortext';
import { PREVIEW_MODES, type PreviewMode } from '@/lib/mcscene';
import { syncQuery } from '@/lib/query';

const { t } = useI18n();

useHead({
  title: () => t('tools.color.name'),
  meta: [{ name: 'description', content: () => t('tools.color.description') }],
});

const route = useRoute();
const fromQuery = (key: string) => (typeof route.query[key] === 'string' ? (route.query[key] as string) : '');

/** Names other than BX Team are `tools.color.presets.<id>`. */
const PRESETS: { id: string; stops: string[] }[] = [
  { id: 'bxteam', stops: ['#25dfdf', '#61da92'] },
  { id: 'sunset', stops: ['#ff5f6d', '#ffc371'] },
  { id: 'nether', stops: ['#ff3d00', '#a3001c'] },
  { id: 'ocean', stops: ['#00c6ff', '#0072ff'] },
  { id: 'amethyst', stops: ['#c471f5', '#fa71cd'] },
  { id: 'rainbow', stops: ['#ff5555', '#ffaa00', '#ffff55', '#55ff55', '#55ffff', '#5555ff', '#ff55ff'] },
];

/** The line under each is `tools.color.formats.<id>`. */
const FORMATS: { id: OutputFormat; label: string }[] = [
  { id: 'minimessage', label: 'MiniMessage' },
  { id: 'legacy-hex', label: '&#RRGGBB' },
  { id: 'spigot-hex', label: '&x&R&R…' },
  { id: 'legacy', label: 'Legacy &a' },
];

const initialStops = fromQuery('c')
  .split('-')
  .map(c => `#${c}`)
  .filter(c => HEX_PATTERN.test(c));

const text = ref(fromQuery('t') || 'BX Team');
const stops = ref<string[]>(initialStops.length ? initialStops : [...(PRESETS[0]?.stops ?? ['#ffffff'])]);
const format = ref<OutputFormat>(
  FORMATS.some(f => f.id === fromQuery('f')) ? (fromQuery('f') as OutputFormat) : 'minimessage',
);
const sign = ref<'&' | '§'>(fromQuery('s') === '1' ? '§' : '&');
const decorations = ref<Decorations>({
  bold: fromQuery('d').includes('b'),
  italic: fromQuery('d').includes('i'),
  underlined: fromQuery('d').includes('u'),
  strikethrough: fromQuery('d').includes('s'),
});

const mode = ref<PreviewMode>('chat');

const output = computed(() => render(text.value, stops.value, decorations.value, format.value, sign.value));
const glyphs = computed(() => paint(text.value, stops.value).map(g => ({ ...g, shown: displayed(g, format.value) })));
const length = computed(() => [...output.value].length);

const copied = ref(false);
async function copy() {
  if (!output.value) return;
  await navigator.clipboard.writeText(output.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1600);
}

function addStop() {
  if (stops.value.length >= 8) return;
  stops.value.push(stops.value[stops.value.length - 1] ?? '#ffffff');
}

/** Typed hex is applied on change, so a half-typed value never reaches the gradient. */
function setHex(index: number, value: string) {
  const hex = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
  if (HEX_PATTERN.test(hex)) stops.value[index] = hex.toLowerCase();
}

function removeStop(index: number) {
  if (stops.value.length > 1) stops.value.splice(index, 1);
}

function randomize() {
  const random = () =>
    `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`;
  stops.value = stops.value.map(random);
}

const sameStops = (a: string[]) => a.join() === stops.value.join();

/** Names are `tools.color.styles.<key>`. */
const DECORATION_LABELS: { key: keyof Decorations; code: string }[] = [
  { key: 'bold', code: 'l' },
  { key: 'italic', code: 'o' },
  { key: 'underlined', code: 'n' },
  { key: 'strikethrough', code: 'm' },
];

watch(
  [text, stops, format, sign, decorations],
  () => {
    const d = decorations.value;
    syncQuery({
      t: text.value === 'BX Team' ? undefined : text.value,
      c: stops.value.map(s => s.slice(1)).join('-'),
      f: format.value === 'minimessage' ? undefined : format.value,
      s: sign.value === '§' ? '1' : undefined,
      d:
        [d.bold && 'b', d.italic && 'i', d.underlined && 'u', d.strikethrough && 's'].filter(Boolean).join('') ||
        undefined,
    });
  },
  { deep: true, flush: 'post' },
);
</script>

<template>
	<ToolsToolPage
		:title="t('tools.color.name')"
		:lead="t('tools.color.lead')"
	>
		<div class="ct">
			<section class="panel ct__setup">
				<label class="field">
					<span class="label">{{ t('tools.color.text') }}</span>
					<input v-model="text" class="input" maxlength="256" spellcheck="false" />
				</label>

				<div class="field">
					<span class="label">{{ t('tools.color.colours') }}</span>
					<div class="stops">
						<div v-for="(stop, i) in stops" :key="i" class="stop">
							<label class="stop__swatch" :style="{ background: stop }">
								<input v-model="stops[i]" type="color" :aria-label="t('tools.color.colour', { n: i + 1 })" />
							</label>
							<input
								class="input stop__hex"
								:value="stop"
								maxlength="7"
								spellcheck="false"
								:aria-label="t('tools.color.colourHex', { n: i + 1 })"
								@change="setHex(i, ($event.target as HTMLInputElement).value)"
							/>
							<button
								type="button"
								class="icon"
								:disabled="stops.length === 1"
								:aria-label="t('tools.color.removeColour', { n: i + 1 })"
								@click="removeStop(i)"
							>
								<Minus :size="15" />
							</button>
						</div>
						<div class="stops__acts">
							<button type="button" class="btn" :disabled="stops.length >= 8" @click="addStop">
								<Plus :size="15" /> {{ t('tools.color.addColour') }}
							</button>
							<button type="button" class="btn" @click="randomize"><Shuffle :size="15" /> {{ t('tools.color.random') }}</button>
						</div>
					</div>
				</div>

				<div class="field">
					<span class="label">{{ t('tools.color.presetsLabel') }}</span>
					<div class="chips">
						<button
							v-for="p in PRESETS"
							:key="p.id"
							type="button"
							class="chip preset"
							:class="{ on: sameStops(p.stops) }"
							@click="stops = [...p.stops]"
						>
							<i :style="{ background: `linear-gradient(90deg, ${p.stops.join(', ')})` }" />
							{{ p.id === 'bxteam' ? 'BX Team' : t(`tools.color.presets.${p.id}`) }}
						</button>
					</div>
				</div>

				<div class="field">
					<span class="label">{{ t('tools.color.legacy') }}</span>
					<div class="legacy">
						<button
							v-for="c in LEGACY_COLORS"
							:key="c.code"
							type="button"
							class="legacy__btn"
							:style="{ background: c.hex }"
							:title="`&${c.code} ${c.name}`"
							:aria-label="t('tools.color.use', { name: c.name })"
							@click="stops = [c.hex]"
						/>
					</div>
				</div>

				<div class="field">
					<span class="label">{{ t('tools.color.style') }}</span>
					<div class="chips">
						<button
							v-for="d in DECORATION_LABELS"
							:key="d.key"
							type="button"
							class="chip deco"
							:class="[{ on: decorations[d.key] }, d.key]"
							:aria-pressed="decorations[d.key]"
							@click="decorations[d.key] = !decorations[d.key]"
						>
							{{ t(`tools.color.styles.${d.key}`) }}
						</button>
					</div>
				</div>
			</section>

			<section class="ct__result">
				<div class="ct__preview">
					<div class="ct__modes" role="tablist" :aria-label="t('tools.color.preview')">
						<button
							v-for="m in PREVIEW_MODES"
							:key="m"
							type="button"
							role="tab"
							:aria-selected="mode === m"
							:class="{ on: mode === m }"
							@click="mode = m"
						>
							{{ t(`tools.color.modes.${m}`) }}
						</button>
					</div>
					<ToolsMcPreview :glyphs="glyphs" :decorations="decorations" :mode="mode" />
				</div>

				<div class="panel ct__output">
					<div class="formats" role="radiogroup" :aria-label="t('tools.color.format')">
						<button
							v-for="f in FORMATS"
							:key="f.id"
							type="button"
							role="radio"
							class="chip"
							:class="{ on: format === f.id }"
							:aria-checked="format === f.id"
							@click="format = f.id"
						>
							{{ f.label }}
						</button>
					</div>
					<p class="hint">{{ t(`tools.color.formats.${format}`) }}</p>

					<div class="code">
						<code>{{ output || ' ' }}</code>
						<button type="button" class="btn primary code__copy" :disabled="!output" @click="copy">
							<component :is="copied ? Check : Copy" :size="15" />
							{{ copied ? t('common.copied') : t('tools.color.copy') }}
						</button>
					</div>

					<div class="ct__foot">
						<label v-if="format !== 'minimessage'" class="check">
							<input v-model="sign" type="checkbox" true-value="§" false-value="&" />
							<i18n-t keypath="tools.color.sign" tag="span" scope="global">
								<template #sign><code>§</code></template>
								<template #amp><code>&amp;</code></template>
							</i18n-t>
						</label>
						<span class="grow" />
						<span class="count" :class="{ over: length > 256 }">{{ t('tools.color.characters', length) }}</span>
					</div>
					<p v-if="length > 256" class="hint bad">
						{{ t('tools.color.tooLong') }}
					</p>
				</div>
			</section>
		</div>
	</ToolsToolPage>
</template>

<style scoped>
.ct {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
	gap: 16px;
	align-items: start;
}

.ct__setup {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.ct__result {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
}

.stops {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.stop {
	display: grid;
	grid-template-columns: 44px minmax(0, 1fr) 44px;
	gap: 8px;
}

.stop__swatch {
	position: relative;
	width: 44px;
	height: 44px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	cursor: pointer;
}

.stop__swatch input {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	cursor: pointer;
}

.stop__hex {
	text-transform: lowercase;
}

.icon {
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: transparent;
	color: var(--mute);
	cursor: pointer;
}

.icon:hover:not(:disabled) {
	color: var(--fg-hi);
	background: var(--surface-2);
}

.icon:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.stops__acts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.preset {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 36px;
}

.preset i {
	width: 18px;
	height: 10px;
	border-radius: 3px;
}

.legacy {
	display: grid;
	grid-template-columns: repeat(8, minmax(0, 1fr));
	gap: 6px;
}

.legacy__btn {
	height: 32px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-1);
	cursor: pointer;
}

.legacy__btn:hover {
	outline: 2px solid var(--fg-hi);
	outline-offset: 1px;
}

.deco {
	min-height: 40px;
}

.deco.bold {
	font-weight: 800;
}

.deco.italic {
	font-style: italic;
}

.deco.underlined {
	text-decoration: underline;
}

.deco.strikethrough {
	text-decoration: line-through;
}









.ct__preview {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.ct__modes {
	display: flex;
	flex-wrap: wrap;
	gap: 2px;
	padding: 3px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-1);
}

.ct__modes button {
	flex: 1 1 auto;
	min-height: 36px;
	padding: 0 12px;
	border: 0;
	border-radius: var(--r-1);
	background: transparent;
	color: var(--mute);
	font: 500 13px/1 var(--font-sans);
	cursor: pointer;
}

.ct__modes button:hover {
	color: var(--fg-hi);
}

.ct__modes button.on {
	background: var(--surface-3);
	color: var(--fg-hi);
}

.ct__output {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.formats {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.formats .chip {
	min-height: 40px;
}

.code {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-1);
}

.code code {
	max-height: 220px;
	overflow: auto;
	font: 400 13px/1.6 var(--font-mono);
	color: var(--fg-hi);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.code__copy {
	align-self: flex-end;
}

.ct__foot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 16px;
}

.grow {
	flex: 1;
}

.count {
	font: 400 12.5px/1 var(--font-mono);
	color: var(--mute);
}

.count.over {
	color: var(--warn);
}

@media (max-width: 900px) {
	.ct {
		grid-template-columns: minmax(0, 1fr);
	}

	.ct__result {
		order: -1;
	}
}

@media (max-width: 480px) {
	.legacy {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.legacy__btn {
		height: 44px;
	}
}
</style>
