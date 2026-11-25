<script setup lang="ts">
import type { HeldNick, Profile, Skin, SkinModel } from '@bx-team/types/schema/skins';
import { Plus, Upload } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { claimNick, fetchMySkins, fetchProfiles, releaseNick, resetSkin, selectSkin, uploadSkin } from '~/lib/skins';

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

const current = computed(() => profiles.value.find(p => p.name === picked.value) ?? null);
const skin = computed(() => current.value?.skin ?? null);
const shown = computed(() => skin.value?.url ?? null);
const full = computed(() => profiles.value.length >= limit.value);

onMounted(async () => {
  const { SkinViewer, IdleAnimation } = await import('skinview3d');
  if (!canvas.value) return;
  viewer.value = new SkinViewer({ canvas: canvas.value, width: 240, height: 320, zoom: 0.85 });
  viewer.value.animation = new IdleAnimation();
  viewer.value.controls.enableZoom = false;
  try {
    const [mine, nicks] = await Promise.all([fetchMySkins(), fetchProfiles()]);
    recent.value = mine.recent;
    take(nicks.profiles, nicks.held, nicks.limit);
  } catch {
    error.value = 'Skins are not reachable right now. Try again in a minute.';
  }
  loaded.value = true;
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
    error.value = e instanceof Error ? e.message : 'Something went wrong.';
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

const until = (iso: string) => new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' });
</script>

<template>
	<section id="skin" class="sk">
		<div class="sk__stage">
			<canvas ref="canvas" aria-label="The nick's skin in 3D; drag to turn it" />
			<p class="sk__note">{{ !loaded ? '' : !current ? 'No nick yet' : shown ? 'Drag to turn' : 'No skin yet' }}</p>
		</div>

		<div class="sk__side">
			<header class="sk__head">
				<div>
					<h2 class="sk__title">Nicks and skins</h2>
					<p class="hint">
						The offline nicks you play with in Riven Launcher. Nobody else can take them, and each wears its own skin.
					</p>
				</div>
				<div v-if="current" class="seg" role="radiogroup" aria-label="Arms">
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
						{{ option === 'classic' ? 'Classic' : 'Slim' }}
					</button>
				</div>
			</header>

			<div class="nicks" role="tablist" aria-label="Nicks">
				<button
					v-for="profile in profiles"
					:key="profile.id"
					type="button"
					role="tab"
					class="nick"
					:class="{ on: profile.name === picked }"
					:aria-selected="profile.name === picked"
					@click="picked = profile.name"
				>
					<span class="face face--sm">
						<template v-if="profile.skin">
							<span class="layer" :style="{ backgroundImage: `url(${profile.skin.url})` }" />
							<span class="layer hat" :style="{ backgroundImage: `url(${profile.skin.url})` }" />
						</template>
					</span>
					<span class="mono">{{ profile.name }}</span>
				</button>
				<form v-if="adding" class="nick nick--field" @submit.prevent="claim(draft)">
					<input
						ref="field"
						v-model="draft"
						class="mono"
						maxlength="16"
						placeholder="Nick"
						aria-label="New nick"
						:disabled="busy"
						@keydown.esc="adding = false"
					/>
					<button type="submit" class="btn primary small" :disabled="busy || draft.trim().length < 3">Add</button>
				</form>
				<button v-else-if="!full" type="button" class="nick nick--add" :disabled="busy || !loaded" @click="openAdd">
					<Plus :size="15" :stroke-width="1.8" />
					Add nick
				</button>
			</div>

			<p v-for="nick in held" :key="nick.name" class="hint held">
				<span class="mono">{{ nick.name }}</span> is kept for you until {{ until(nick.until) }}.
				<button type="button" class="link" :disabled="busy || full" @click="claim(nick.name)">Take it back</button>
			</p>

			<ul v-if="current" class="sk__lib">
				<li>
					<button type="button" class="tile tile--add" :disabled="busy" @click="file?.click()">
						<Upload :size="20" :stroke-width="1.6" />
						{{ busy ? 'Saving…' : 'Upload PNG' }}
					</button>
					<input ref="file" type="file" accept="image/png" hidden @change="chosen" />
				</li>
				<li v-for="item in recent" :key="item.hash">
					<button
						type="button"
						class="tile"
						:class="{ on: skin?.hash === item.hash }"
						:disabled="busy || skin?.hash === item.hash"
						:aria-label="skin?.hash === item.hash ? 'The skin this nick wears' : 'Wear this skin'"
						@click="wear(item)"
					>
						<span class="face">
							<span class="layer" :style="{ backgroundImage: `url(${item.url})` }" />
							<span class="layer hat" :style="{ backgroundImage: `url(${item.url})` }" />
						</span>
						{{ skin?.hash === item.hash ? 'Wearing' : item.model === 'slim' ? 'Slim' : 'Classic' }}
					</button>
				</li>
			</ul>
			<p v-else-if="loaded && !adding" class="empty">
				Add the nick you play with on offline accounts. Up to {{ limit }}; a removed nick stays yours for a few days.
			</p>

			<footer class="sk__foot">
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
				<p v-else class="hint">A 64×64 PNG, or 64×32 from before 1.8. Click a skin to wear it.</p>
				<div v-if="current" class="sk__acts">
					<button v-if="skin" type="button" class="btn quiet small" :disabled="busy" @click="reset">Remove skin</button>
					<button type="button" class="btn quiet small" :disabled="busy" @click="release">Remove nick</button>
				</div>
			</footer>
		</div>
	</section>
</template>

<style scoped>
.sk {
	display: flex;
	flex-wrap: wrap;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
}

.sk__stage {
	position: relative;
	display: grid;
	flex: 1 1 260px;
	max-width: 300px;
	min-height: 340px;
	place-items: center;
	border-right: 1px solid var(--line);
	background: radial-gradient(circle at 50% 35%, var(--surface-2), var(--surface-deep));
}

.sk__stage canvas {
	display: block;
	cursor: grab;
}

.sk__note {
	position: absolute;
	inset: auto 0 var(--s-3);
	margin: 0;
	text-align: center;
	font: 400 12px/1.4 var(--font-sans);
	color: var(--mute);
}

.sk__side {
	display: flex;
	flex: 999 1 320px;
	flex-direction: column;
	gap: var(--s-4);
	min-width: 0;
	padding: var(--s-5) var(--s-6);
}

.sk__head {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--s-3);
}

.sk__title {
	margin: 0 0 4px;
	font: 700 17px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.seg {
	display: inline-flex;
	padding: 3px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-1);
}

.seg button {
	min-height: 32px;
	padding: 0 14px;
	border: 0;
	border-radius: calc(var(--r-2) - 3px);
	background: none;
	font: 500 13px/1 var(--font-sans);
	color: var(--mute);
	cursor: pointer;
}

.seg button.on {
	background: var(--surface-2);
	color: var(--fg-hi);
}

.sk__lib {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
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
	height: 100px;
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

.sk__foot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--s-2) var(--s-3);
	margin-top: auto;
	padding-top: var(--s-4);
	border-top: 1px solid var(--line);
}

.mono {
	font-family: var(--font-mono);
}

.nicks {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-2);
}

.nick {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 40px;
	padding: 0 12px 0 6px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-1);
	font: 500 13px/1 var(--font-sans);
	color: var(--fg);
	cursor: pointer;
}

.nick.on {
	border-color: var(--accent);
	color: var(--fg-hi);
}

.nick--add {
	padding: 0 12px;
	border-style: dashed;
	border-color: var(--line-2);
	background: transparent;
	color: var(--dim);
}

.nick--field {
	padding: 4px 4px 4px 10px;
	cursor: default;
}

.nick--field input {
	width: 150px;
	border: 0;
	outline: none;
	background: none;
	font-size: 13px;
	color: var(--fg-hi);
}

.held {
	margin: 0;
}

.link {
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	color: var(--accent);
	cursor: pointer;
}

.link:disabled {
	color: var(--mute);
	cursor: default;
}

.empty {
	margin: 0;
	font: 400 14px/1.5 var(--font-sans);
	color: var(--mute);
}

.sk__acts {
	display: flex;
	gap: var(--s-2);
}

.face--sm {
	--size: 28px;
	background: var(--surface-2);
}

/* The face is 8×8 at (8, 8) of the 64-wide texture, the hat layer the same at (40, 8). */
.face {
	--size: 40px;
	position: relative;
	width: var(--size);
	height: var(--size);
	overflow: hidden;
	border-radius: var(--r-1);
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

@media (max-width: 640px) {
	.sk__stage {
		max-width: none;
		border-right: 0;
		border-bottom: 1px solid var(--line);
	}
}
</style>
