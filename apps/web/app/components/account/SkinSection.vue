<script setup lang="ts">
import type { HeldNick, Profile, Skin, SkinModel } from '@bx-team/types/schema/skins';
import { Ban, Plus, Trash2, Undo2, Upload, UserPlus } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { claimNick, fetchMySkins, fetchProfiles, releaseNick, resetSkin, selectSkin, uploadSkin } from '~/lib/skins';

const { t } = useI18n();
const format = useFormat();
const profiles = ref<Profile[]>([]);
const held = ref<HeldNick[]>([]);
const limit = ref(5);
const picked = ref<string | null>(null);
const recent = ref<Skin[]>([]);
const model = ref<SkinModel>('classic');
const loaded = ref(false);
const busy = ref(false);
const error = ref('');
const adding = ref(false);
const draft = ref('');
const field = ref<HTMLInputElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const file = ref<HTMLInputElement | null>(null);
const viewer = shallowRef<import('skinview3d').SkinViewer | null>(null);
/** No WebGL here: the stage shows the flat front of the skin instead. */
const flat = ref(false);

const current = computed(() => profiles.value.find(p => p.name === picked.value) ?? null);
const skin = computed(() => current.value?.skin ?? null);
const shown = computed(() => skin.value?.url ?? null);
const full = computed(() => profiles.value.length >= limit.value);

onMounted(async () => {
  try {
    const [mine, nicks] = await Promise.all([fetchMySkins(), fetchProfiles()]);
    recent.value = mine.recent;
    take(nicks.profiles, nicks.held, nicks.limit);
  } catch {
    error.value = t('account.skins.unreachable');
  }
  loaded.value = true;
});

// Apart from the data: without WebGL the nicks and skins still work, only the 3D figure is missing.
onMounted(async () => {
  try {
    const { SkinViewer, IdleAnimation } = await import('skinview3d');
    if (!canvas.value) return;
    viewer.value = new SkinViewer({ canvas: canvas.value, width: 220, height: 300, zoom: 0.85 });
    viewer.value.animation = new IdleAnimation();
    viewer.value.controls.enableZoom = false;
  } catch {
    flat.value = true;
  }
});

onBeforeUnmount(() => viewer.value?.dispose());

watch(skin, worn => {
  if (worn) model.value = worn.model;
});

watch([shown, model, viewer], ([url, m, v]) => {
  if (!v) return;
  if (url) v.loadSkin(url, { model: m === 'slim' ? 'slim' : 'default' });
  else v.resetSkin();
});

function take(list: Profile[], released: HeldNick[], max: number) {
  profiles.value = list;
  held.value = released;
  limit.value = max;
  if (!list.some(p => p.name === picked.value)) picked.value = list[0]?.name ?? null;
}

async function act(work: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await work();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('account.skins.failed');
  } finally {
    busy.value = false;
  }
}

async function reload() {
  const nicks = await fetchProfiles();
  take(nicks.profiles, nicks.held, nicks.limit);
}

function update(next: Profile) {
  profiles.value = profiles.value.map(p => (p.name === next.name ? next : p));
  const worn = next.skin;
  if (worn) recent.value = [worn, ...recent.value.filter(s => s.hash !== worn.hash)].slice(0, 12);
}

async function openAdd() {
  adding.value = true;
  await nextTick();
  field.value?.focus();
}

async function claim(name: string) {
  await act(async () => {
    const claimed = await claimNick(name.trim());
    await reload();
    picked.value = claimed.name;
    adding.value = false;
    draft.value = '';
  });
}

async function release() {
  const name = picked.value;
  if (!name) return;
  await act(async () => {
    await releaseNick(name);
    await reload();
  });
}

async function chosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const png = input.files?.[0];
  input.value = '';
  const name = picked.value;
  if (!png || !name) return;
  await act(async () => update(await uploadSkin(name, png, model.value)));
}

async function setModel(next: SkinModel) {
  model.value = next;
  const worn = skin.value;
  const name = picked.value;
  if (!worn || !name || worn.model === next) return;
  await act(async () => update(await selectSkin(name, worn.hash, next)));
}

async function wear(choice: Skin) {
  const name = picked.value;
  if (!name) return;
  await act(async () => update(await selectSkin(name, choice.hash, model.value)));
}

async function reset() {
  const name = picked.value;
  if (!name) return;
  await act(async () => {
    await resetSkin(name);
    profiles.value = profiles.value.map(p => (p.name === name ? { ...p, skin: null } : p));
  });
}
</script>

<template>
	<section id="skin" class="sk">
		<header class="sk__head">
			<h2 class="sk__title">{{ $t('account.skins.title') }}</h2>
			<p class="hint">{{ $t('account.skins.lede') }}</p>
		</header>

		<div class="sk__body">
			<nav class="sk__nicks" :aria-label="$t('account.skins.nicks')">
				<span class="label">{{ $t('account.skins.nicksCount', { n: profiles.length, limit }) }}</span>
				<ul class="nk-list">
					<li v-for="profile in profiles" :key="profile.id">
						<button
							type="button"
							class="nick"
							:class="{ on: profile.name === picked }"
							:aria-current="profile.name === picked"
							@click="picked = profile.name"
						>
							<span class="face face--sm">
								<template v-if="profile.skin">
									<span class="layer" :style="{ backgroundImage: `url(${profile.skin.url})` }" />
									<span class="layer hat" :style="{ backgroundImage: `url(${profile.skin.url})` }" />
								</template>
							</span>
							<span class="mono grow">{{ profile.name }}</span>
						</button>
						<button
							v-if="profile.name === picked"
							type="button"
							class="icon-btn"
							:disabled="busy"
							:aria-label="$t('account.skins.removeNick', { name: profile.name })"
							:title="$t('account.skins.removeNickTitle')"
							@click="release"
						>
							<Trash2 :size="15" :stroke-width="1.7" />
						</button>
					</li>
				</ul>

				<form v-if="adding" class="add" @submit.prevent="claim(draft)">
					<input
						ref="field"
						v-model="draft"
						class="mono"
						maxlength="16"
						:placeholder="$t('account.skins.nick')"
						:aria-label="$t('account.skins.newNick')"
						:disabled="busy"
						@keydown.esc="adding = false"
					/>
					<button type="submit" class="btn primary small" :disabled="busy || draft.trim().length < 3">{{ $t('account.skins.add') }}</button>
				</form>
				<button v-else-if="!full" type="button" class="nick nick--add" :disabled="busy || !loaded" @click="openAdd">
					<Plus :size="15" :stroke-width="1.8" />
					{{ $t('account.skins.addNick') }}
				</button>

				<template v-if="held.length">
					<span class="label label--gap">{{ $t('account.skins.removed') }}</span>
					<ul class="nk-list">
						<li v-for="nick in held" :key="nick.name" class="held">
							<span class="grow">
								<span class="mono">{{ nick.name }}</span>
								<span class="sub">{{ $t('account.skins.until', { date: format.dayMonth(nick.until) }) }}</span>
							</span>
							<button
								type="button"
								class="icon-btn"
								:disabled="busy || full"
								:aria-label="$t('account.skins.takeBack', { name: nick.name })"
								:title="$t('account.skins.takeBackTitle')"
								@click="claim(nick.name)"
							>
								<Undo2 :size="15" :stroke-width="1.7" />
							</button>
						</li>
					</ul>
				</template>
			</nav>

			<div class="sk__stage">
				<AccountSkinFigure v-if="flat && shown" :url="shown" :slim="model === 'slim'" :scale="7" class="sk__flat" />
				<canvas v-show="!flat" ref="canvas" :aria-label="$t('account.skins.canvas')" />
				<p class="sk__note">
					{{
						!loaded
							? ''
							: !current
								? $t('account.skins.noNick')
								: !shown
									? $t('account.skins.noSkin')
									: flat
										? ''
										: $t('account.skins.drag')
					}}
				</p>
				<div v-if="current" class="seg" role="radiogroup" :aria-label="$t('account.skins.arms')">
					<button
						v-for="option in (['classic', 'slim'] as const)"
						:key="option"
						type="button"
						role="radio"
						:aria-checked="model === option"
						:class="{ on: model === option }"
						:disabled="busy"
						@click="setModel(option)"
					>
						{{ option === 'classic' ? $t('account.skins.classicArms') : $t('account.skins.slimArms') }}
					</button>
				</div>
			</div>

			<div class="sk__lib">
				<template v-if="current">
					<i18n-t keypath="account.skins.skinsOf" tag="span" class="label" scope="global">
						<template #name><span class="mono">{{ current.name }}</span></template>
					</i18n-t>
					<ul class="grid">
						<li>
							<button type="button" class="tile tile--add" :disabled="busy" @click="file?.click()">
								<Upload :size="20" :stroke-width="1.6" />
								{{ busy ? $t('account.skins.saving') : $t('account.skins.upload') }}
							</button>
							<input ref="file" type="file" accept="image/png" hidden @change="chosen" />
						</li>
						<li>
							<button
								type="button"
								class="tile"
								:class="{ on: !skin }"
								:disabled="busy || !skin"
								:aria-label="skin ? $t('account.skins.takeOff') : $t('account.skins.wearsNone')"
								@click="reset"
							>
								<Ban :size="20" :stroke-width="1.6" />
								{{ $t('account.skins.noSkin') }}
							</button>
						</li>
						<li v-for="item in recent" :key="item.hash">
							<button
								type="button"
								class="tile"
								:class="{ on: skin?.hash === item.hash }"
								:disabled="busy || skin?.hash === item.hash"
								:aria-label="skin?.hash === item.hash ? $t('account.skins.wearingLabel') : $t('account.skins.wear')"
								@click="wear(item)"
							>
								<span class="face">
									<span class="layer" :style="{ backgroundImage: `url(${item.url})` }" />
									<span class="layer hat" :style="{ backgroundImage: `url(${item.url})` }" />
								</span>
								{{
									skin?.hash === item.hash
										? $t('account.skins.wearing')
										: item.model === 'slim'
											? $t('account.skins.slim')
											: $t('account.skins.classic')
								}}
							</button>
						</li>
					</ul>
				</template>
				<div v-else-if="loaded" class="blank">
					<UserPlus :size="28" :stroke-width="1.5" />
					<p>{{ $t('account.skins.blank', { limit }) }}</p>
					<button type="button" class="btn primary small" :disabled="busy || adding" @click="openAdd">{{ $t('account.skins.addNick') }}</button>
				</div>
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
			</div>
		</div>
	</section>
</template>

<style scoped>
.sk {
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
}

.sk__head {
	padding: var(--s-5) var(--s-6) var(--s-4);
	border-bottom: 1px solid var(--line);
}

.sk__title {
	margin: 0 0 4px;
	font: 700 17px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.sk__body {
	display: grid;
	grid-template-columns: 240px 260px minmax(0, 1fr);
}

.label {
	display: block;
	margin-bottom: var(--s-2);
	font: 500 11px/1.4 var(--font-mono);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--mute);
}

.label .mono {
	text-transform: none;
	color: var(--fg);
}

.label--gap {
	margin-top: var(--s-5);
}

.mono {
	font-family: var(--font-mono);
}

.grow {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-align: left;
}

.sk__nicks {
	display: flex;
	flex-direction: column;
	padding: var(--s-5) var(--s-4);
	border-right: 1px solid var(--line);
}

.nk-list {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.nk-list li {
	display: flex;
	align-items: center;
	gap: 4px;
}

.nick {
	display: flex;
	flex: 1;
	align-items: center;
	gap: 10px;
	min-width: 0;
	height: 40px;
	padding: 0 8px;
	border: 0;
	border-radius: var(--r-2);
	background: none;
	font: 500 13px/1 var(--font-sans);
	color: var(--fg);
	cursor: pointer;
}

.nick:hover:not(:disabled) {
	background: var(--surface-1);
}

.nick.on {
	background: var(--surface-2);
	color: var(--fg-hi);
}

.nick--add {
	flex: none;
	width: 100%;
	margin-top: 2px;
	color: var(--dim);
}

.icon-btn {
	display: grid;
	flex: none;
	width: 32px;
	height: 32px;
	place-items: center;
	padding: 0;
	border: 0;
	border-radius: var(--r-1);
	background: none;
	color: var(--mute);
	cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
	background: var(--surface-1);
	color: var(--fg-hi);
}

.icon-btn:disabled {
	opacity: 0.4;
	cursor: default;
}

.add {
	display: flex;
	align-items: center;
	gap: 6px;
	height: 40px;
	margin-top: 2px;
	padding: 0 4px 0 10px;
	border: 1px solid var(--accent);
	border-radius: var(--r-2);
	background: var(--surface-1);
}

.add input {
	flex: 1;
	min-width: 0;
	border: 0;
	outline: none;
	background: none;
	font-size: 13px;
	color: var(--fg-hi);
}

.held {
	min-height: 40px;
	padding-left: 8px;
	font-size: 13px;
	color: var(--mute);
}

.held .sub {
	display: block;
	margin-top: 2px;
	font: 400 12px/1.3 var(--font-sans);
	color: var(--dim);
}

.sk__stage {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--s-3);
	padding: var(--s-4) var(--s-3) var(--s-5);
	border-right: 1px solid var(--line);
	background: radial-gradient(circle at 50% 35%, var(--surface-2), var(--surface-deep));
}

.sk__flat {
	margin: var(--s-5) 0;
}

.sk__stage canvas {
	display: block;
	cursor: grab;
}

.sk__note {
	margin: -8px 0 0;
	font: 400 12px/1.4 var(--font-sans);
	color: var(--mute);
}

.seg {
	display: inline-flex;
	padding: 3px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-1);
}

.seg button {
	min-height: 30px;
	padding: 0 12px;
	border: 0;
	border-radius: calc(var(--r-2) - 3px);
	background: none;
	font: 500 12px/1 var(--font-sans);
	color: var(--mute);
	cursor: pointer;
}

.seg button.on {
	background: var(--surface-2);
	color: var(--fg-hi);
}

.sk__lib {
	display: flex;
	flex-direction: column;
	gap: var(--s-3);
	min-width: 0;
	padding: var(--s-5) var(--s-6);
}

.sk__lib .label {
	margin-bottom: 0;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
	gap: var(--s-2);
	margin: 0;
	padding: 0;
	list-style: none;
}

.tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	width: 100%;
	height: 104px;
	padding: 0;
	border: 2px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-1);
	font: 500 12px/1.2 var(--font-sans);
	color: var(--mute);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		color 0.15s ease;
}

.tile:hover:not(:disabled) {
	border-color: var(--line-2);
	color: var(--fg);
}

.tile.on {
	border-color: var(--accent);
	color: var(--fg-hi);
	cursor: default;
}

.tile--add {
	border-style: dashed;
	border-color: var(--line-2);
	background: transparent;
	color: var(--dim);
}

.blank {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--s-3);
	min-height: 240px;
	text-align: center;
	color: var(--dim);
}

.blank p {
	max-width: 340px;
	margin: 0;
	font: 400 14px/1.5 var(--font-sans);
	color: var(--mute);
}

/* The face is 8×8 at (8, 8) of the 64-wide texture, the hat layer the same at (40, 8). */
.face {
	--size: 40px;
	position: relative;
	flex: none;
	width: var(--size);
	height: var(--size);
	overflow: hidden;
	border-radius: var(--r-1);
}

.face--sm {
	--size: 26px;
	background: var(--surface-3);
}

.layer {
	position: absolute;
	inset: 0;
	background-repeat: no-repeat;
	background-size: calc(var(--size) * 8) auto;
	background-position: calc(var(--size) * -1) calc(var(--size) * -1);
	image-rendering: pixelated;
}

.layer.hat {
	background-position: calc(var(--size) * -5) calc(var(--size) * -1);
}

@media (max-width: 900px) {
	.sk__body {
		grid-template-columns: 220px minmax(0, 1fr);
	}

	.sk__lib {
		grid-column: 1 / -1;
		border-top: 1px solid var(--line);
	}

	.sk__stage {
		border-right: 0;
	}
}

@media (max-width: 560px) {
	.sk__body {
		grid-template-columns: minmax(0, 1fr);
	}

	.sk__nicks {
		border-right: 0;
		border-bottom: 1px solid var(--line);
	}
}
</style>
