<script setup lang="ts">
import { Check, Copy, Search } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { dashed, fetchProfile, type MojangProfile, offlineUuid, USERNAME_PATTERN, undashed } from '@/lib/mojang';
import { syncQuery } from '@/lib/query';

useHead({ title: 'UUID lookup' });

const route = useRoute();
const username = ref(typeof route.query.name === 'string' ? route.query.name : '');
const profile = ref<MojangProfile | null>(null);
const error = ref('');
const loading = ref(false);
const copied = ref('');

const valid = computed(() => USERNAME_PATTERN.test(username.value));
const offline = computed(() => (valid.value ? offlineUuid(username.value) : null));

const rows = computed(() => {
  const list: { key: string; label: string; value: string }[] = [];
  if (profile.value) {
    list.push(
      { key: 'online', label: 'Online UUID', value: profile.value.id },
      { key: 'online-plain', label: 'Online, no dashes', value: undashed(profile.value.id) },
    );
  }
  if (offline.value) {
    list.push(
      { key: 'offline', label: 'Offline UUID', value: offline.value },
      { key: 'offline-plain', label: 'Offline, no dashes', value: undashed(offline.value) },
    );
  }
  return list;
});

async function look() {
  if (!valid.value || loading.value) return;
  loading.value = true;
  error.value = '';
  profile.value = null;
  try {
    profile.value = await fetchProfile(username.value);
  } catch (thrown) {
    const body = (thrown as { data?: { message?: string } }).data;
    error.value = body?.message ?? 'Could not reach the lookup service.';
  } finally {
    loading.value = false;
  }
}

async function copy(key: string, value: string) {
  await navigator.clipboard.writeText(value);
  copied.value = key;
  setTimeout(() => {
    if (copied.value === key) copied.value = '';
  }, 1600);
}

watch(username, () => {
  profile.value = null;
  error.value = '';
  syncQuery({ name: username.value || undefined });
});

onMounted(() => {
  if (valid.value) look();
});

/** Head is 8x8 at (8,8) in the skin, hat layer at (40,8). Cropped with background-position
 *  rather than a canvas, because Mojang's texture CDN sends no CORS header. */
const SCALE = 14;

const headStyle = (offsetX: number) => ({
  backgroundImage: profile.value?.skin ? `url(${profile.value.skin})` : 'none',
  backgroundSize: `${64 * SCALE}px ${64 * SCALE}px`,
  backgroundPosition: `-${offsetX * SCALE}px -${8 * SCALE}px`,
  width: `${8 * SCALE}px`,
  height: `${8 * SCALE}px`,
});
</script>

<template>
	<ToolsToolPage
		title="UUID lookup"
		lead="Turn a Minecraft username into the UUID a server will store it under. The online one comes from Mojang, the offline one is derived from the name itself, and they are never the same."
	>
		<section class="setup">
			<form class="search" @submit.prevent="look">
				<label class="label" for="name">Username</label>
				<div class="search-row">
					<input
						id="name"
						v-model="username"
						class="input"
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						maxlength="16"
					/>
					<button type="submit" class="go" :disabled="!valid || loading">
						<Search :size="14" :stroke-width="1.9" />
						<span>{{ loading ? 'Looking up' : 'Look up' }}</span>
					</button>
				</div>
				<p v-if="username && !valid" class="hint bad">
					A Minecraft username is 1 to 16 letters, digits or underscores.
				</p>
				<p v-else class="hint">The offline UUID appears as you type. The online one takes a request to Mojang.</p>
			</form>
		</section>

		<section v-if="rows.length" class="result">
			<div class="portrait">
				<div class="head" :style="headStyle(8)" :class="{ blank: !profile?.skin }">
					<div v-if="profile?.skin" class="hat" :style="headStyle(40)" />
				</div>
				<div class="portrait-meta">
					<span class="portrait-name">{{ profile?.name ?? username }}</span>
					<span v-if="profile" class="portrait-note">{{ profile.model }} model</span>
					<span v-else class="portrait-note">no Mojang account</span>
					<a v-if="profile?.skin" :href="profile.skin" target="_blank" rel="noopener">Skin</a>
					<a v-if="profile?.cape" :href="profile.cape" target="_blank" rel="noopener">Cape</a>
				</div>
			</div>

			<ul class="values">
				<li v-for="row in rows" :key="row.key" class="value">
					<span class="value-label">{{ row.label }}</span>
					<code class="value-text">{{ row.value }}</code>
					<button type="button" class="value-copy" :aria-label="`Copy ${row.label}`" @click="copy(row.key, row.value)">
						<component :is="copied === row.key ? Check : Copy" :size="13" :stroke-width="1.8" />
					</button>
				</li>
			</ul>
		</section>

		<ToolsNoticeList
			v-if="error"
			class="failure"
			:notices="[
				{
					level: 'warning',
					title: error,
					body: 'The offline UUID above still applies: a server in offline mode never asks Mojang, it derives the UUID from the name it was given.',
				},
			]"
		/>

		<section class="section">
			<h2>Which one does a server use</h2>
			<div class="explain">
				<article>
					<h3>Online</h3>
					<p>
						With <code>online-mode=true</code> the server asks Mojang who is connecting and stores the account UUID.
						It follows the player across name changes, and two people cannot end up sharing one.
					</p>
				</article>
				<article>
					<h3>Offline</h3>
					<p>
						With <code>online-mode=false</code> there is nobody to ask, so the server hashes
						<code>OfflinePlayer:&lt;name&gt;</code> into a UUID. Change the name and every bit of stored data is gone,
						because the UUID changed with it.
					</p>
				</article>
				<article>
					<h3>Behind a proxy</h3>
					<p>
						A backend server runs with <code>online-mode=false</code> but still gets the online UUID, because the proxy
						authenticated and forwarded it. That is what player data on a network keys on.
					</p>
				</article>
			</div>
		</section>
	</ToolsToolPage>
</template>

<style scoped>
.setup {
	padding: 16px;
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	background: color-mix(in oklab, var(--bg-1) 88%, transparent);
}

.label {
	display: block;
	margin-bottom: 8px;
	font: 600 11px/1.4 var(--font-sans);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.search-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.input {
	flex: 1 1 240px;
	min-width: 0;
	min-height: 44px;
	padding: 0 14px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-md);
	background: var(--bg-3);
	color: var(--fg-hi);
	font: 500 15px/1 var(--font-mono);
}

.input:focus {
	outline: none;
	border-color: color-mix(in oklab, var(--fg) 45%, var(--line));
}

.go {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	flex: 0 0 auto;
	min-height: 44px;
	padding: 0 18px;
	border: 1px solid color-mix(in oklab, var(--fg) 30%, var(--line));
	border-radius: var(--r-md);
	background: var(--bg-3);
	color: var(--fg-hi);
	font: 500 13.5px/1 var(--font-sans);
	cursor: pointer;
}

.go:hover:not(:disabled) {
	background: var(--bg-2);
}

.go:disabled {
	color: var(--mute);
	border-color: var(--line);
	cursor: not-allowed;
}

.hint {
	margin: 10px 2px 0;
	font: 400 12.5px/1.5 var(--font-sans);
	color: var(--mute);
}

.hint.bad {
	color: var(--warn);
}

.result {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 20px;
	align-items: start;
	margin-top: 16px;
	padding: 16px;
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	background: var(--bg-1);
}

.portrait {
	display: flex;
	flex-direction: column;
	gap: 10px;
	align-items: center;
}

.head {
	position: relative;
	border-radius: var(--r-sm);
	background-repeat: no-repeat;
	image-rendering: pixelated;
}

.head.blank {
	background: repeating-conic-gradient(var(--bg-3) 0% 25%, var(--bg-2) 0% 50%) 50% / 24px 24px;
}

.hat {
	position: absolute;
	inset: 0;
	background-repeat: no-repeat;
	image-rendering: pixelated;
}

.portrait-meta {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	text-align: center;
}

.portrait-name {
	font: 600 14px/1.4 var(--font-sans);
	color: var(--fg-hi);
	overflow-wrap: anywhere;
}

.portrait-note {
	font: 400 12px/1.4 var(--font-sans);
	color: var(--mute);
}

.portrait-meta a {
	font: 500 12px/1.6 var(--font-sans);
	color: var(--brand);
}

.values {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	overflow: hidden;
}

.value {
	display: grid;
	grid-template-columns: 150px minmax(0, 1fr) auto;
	gap: 12px;
	align-items: center;
	padding: 10px 12px;
	border-bottom: 1px solid var(--line);
	background: var(--bg-2);
}

.value:last-child {
	border-bottom: 0;
}

.value-label {
	font: 500 12px/1.5 var(--font-sans);
	color: var(--mute);
}

.value-text {
	font: 500 13px/1.5 var(--font-mono);
	color: var(--fg-hi);
	overflow-wrap: anywhere;
}

.value-copy {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-sm);
	background: var(--bg-1);
	color: var(--mute);
	cursor: pointer;
}

.value-copy:hover {
	color: var(--fg-hi);
	border-color: color-mix(in oklab, var(--fg) 30%, var(--line));
}

.failure {
	margin-top: 16px;
}

.section {
	margin-top: 40px;
}

.section h2 {
	margin: 0 0 14px;
	font: 700 18px/1.3 var(--font-heading);
	color: var(--fg-hi);
}

.explain {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 12px;
}

.explain article {
	padding: 14px 16px;
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	background: var(--bg-1);
}

.explain h3 {
	margin: 0 0 6px;
	font: 600 13px/1.4 var(--font-sans);
	color: var(--fg-hi);
}

.explain p {
	margin: 0;
	font: 400 13px/1.6 var(--font-sans);
	color: var(--dim);
}

.explain code {
	font: 500 12px/1 var(--font-mono);
	color: var(--fg);
	overflow-wrap: anywhere;
}

@media (max-width: 720px) {
	.result {
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
	}

	.portrait {
		flex-direction: row;
		align-items: center;
		gap: 14px;
	}

	.portrait-meta {
		align-items: flex-start;
		text-align: left;
	}

	.value {
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 2px 12px;
	}

	.value-label {
		grid-column: 1;
	}

	.value-copy {
		grid-column: 2;
		grid-row: 1 / span 2;
	}
}

@media (max-width: 640px) {
	.setup {
		padding: 14px;
	}

	.go {
		flex: 1 1 auto;
	}
}
</style>
