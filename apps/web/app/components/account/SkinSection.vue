<script setup lang="ts">
import type { MinecraftProfile } from '@bx-team/types/schema/bxid';
import type { Skin, SkinModel } from '@bx-team/types/schema/skins';
import { Upload } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { fetchMinecraftProfiles } from '~/lib/auth';
import { fetchMySkins, resetSkin, selectSkin, uploadSkin } from '~/lib/skins';

const skin = ref<Skin | null>(null);
const recent = ref<Skin[]>([]);
const profile = ref<MinecraftProfile | null>(null);
const model = ref<SkinModel>('classic');
const loaded = ref(false);
const busy = ref(false);
const error = ref('');
const canvas = ref<HTMLCanvasElement | null>(null);
const file = ref<HTMLInputElement | null>(null);
const viewer = shallowRef<import('skinview3d').SkinViewer | null>(null);

/** Without an upload, friends see the skin of the linked Minecraft profile. */
const shown = computed(
  () => skin.value?.url ?? (profile.value ? `https://crafthead.net/skin/${profile.value.id}` : null),
);

onMounted(async () => {
  const { SkinViewer, IdleAnimation } = await import('skinview3d');
  if (!canvas.value) return;
  viewer.value = new SkinViewer({ canvas: canvas.value, width: 240, height: 320, zoom: 0.85 });
  viewer.value.animation = new IdleAnimation();
  viewer.value.controls.enableZoom = false;
  try {
    const [mine, profiles] = await Promise.all([fetchMySkins(), fetchMinecraftProfiles().catch(() => [])]);
    skin.value = mine.skin;
    recent.value = mine.recent;
    profile.value = profiles[0] ?? null;
    if (mine.skin) model.value = mine.skin.model;
  } catch {
    error.value = 'Skins are not reachable right now. Try again in a minute.';
  }
  loaded.value = true;
});

onBeforeUnmount(() => viewer.value?.dispose());

watch([shown, model, viewer], ([url, m, v]) => {
  if (!v) return;
  if (url) v.loadSkin(url, { model: m === 'slim' ? 'slim' : 'default' });
  else v.resetSkin();
});

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

function remember(worn: Skin) {
  skin.value = worn;
  recent.value = [worn, ...recent.value.filter(s => s.hash !== worn.hash)].slice(0, 12);
}

async function picked(event: Event) {
  const input = event.target as HTMLInputElement;
  const chosen = input.files?.[0];
  input.value = '';
  if (!chosen) return;
  await act(async () => remember(await uploadSkin(chosen, model.value)));
}

async function setModel(next: SkinModel) {
  model.value = next;
  const worn = skin.value;
  if (!worn || worn.model === next) return;
  await act(async () => remember(await selectSkin(worn.hash, next)));
}

async function wear(choice: Skin) {
  await act(async () => {
    remember(await selectSkin(choice.hash, model.value));
  });
}

async function reset() {
  await act(async () => {
    await resetSkin();
    skin.value = null;
  });
}
</script>

<template>
	<section id="skin" class="sk">
		<div class="sk__stage">
			<canvas ref="canvas" aria-label="Your skin in 3D; drag to turn it" />
			<p class="sk__note">{{ loaded && !shown ? 'No skin yet' : 'Drag to turn' }}</p>
		</div>

		<div class="sk__side">
			<header class="sk__head">
				<div>
					<h2 class="sk__title">Skin</h2>
					<p class="hint">Friends see it in Riven Launcher, on offline accounts too.</p>
				</div>
				<div class="seg" role="radiogroup" aria-label="Arms">
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

			<ul class="sk__lib">
				<li>
					<button type="button" class="tile tile--add" :disabled="busy" @click="file?.click()">
						<Upload :size="20" :stroke-width="1.6" />
						{{ busy ? 'Saving…' : 'Upload PNG' }}
					</button>
					<input ref="file" type="file" accept="image/png" hidden @change="picked" />
				</li>
				<li v-for="item in recent" :key="item.hash">
					<button
						type="button"
						class="tile"
						:class="{ on: skin?.hash === item.hash }"
						:disabled="busy || skin?.hash === item.hash"
						:aria-label="skin?.hash === item.hash ? 'The skin you wear' : 'Wear this skin'"
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

			<footer class="sk__foot">
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
				<p v-else class="hint">A 64×64 PNG, or 64×32 from before 1.8. Click a skin to wear it.</p>
				<button v-if="skin" type="button" class="btn quiet small" :disabled="busy" @click="reset">
					Use the Minecraft one
				</button>
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
