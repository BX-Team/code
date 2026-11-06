<script setup lang="ts">
import { Check, Copy, ExternalLink, Search, UserRound } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import {
  fetchProfile,
  LookupError,
  type MojangProfile,
  offlineUuid,
  USERNAME_PATTERN,
  UUID_PATTERN,
  undashed,
} from '@/lib/mojang';
import { syncQuery } from '@/lib/query';

useHead({
  title: 'UUID lookup',
  meta: [{ name: 'description', content: 'Online and offline UUIDs of a Minecraft player, with the skin.' }],
});

const route = useRoute();
const query = ref(typeof route.query.name === 'string' ? route.query.name : '');
const profile = ref<MojangProfile | null>(null);
const error = ref('');
const missing = ref(false);
const loading = ref(false);
const copied = ref('');

const input = computed(() => query.value.trim());
const isName = computed(() => USERNAME_PATTERN.test(input.value));
const valid = computed(() => isName.value || UUID_PATTERN.test(input.value));

/** An offline UUID is derived from a name, so a UUID query gets one only once the name is known. */
const offlineName = computed(() => profile.value?.name ?? (isName.value ? input.value : null));
const offline = computed(() => (offlineName.value ? offlineUuid(offlineName.value) : null));

/** The form NBT and commands store a UUID in: four signed 32-bit integers. */
function intArray(uuid: string): string {
  const hex = undashed(uuid);
  const ints = [0, 8, 16, 24].map(at => Number.parseInt(hex.slice(at, at + 8), 16) | 0);
  return `[I;${ints.join(',')}]`;
}

interface Row {
  key: string;
  label: string;
  value: string;
}

const groups = computed(() => {
  const out: { title: string; rows: Row[] }[] = [];
  if (profile.value) {
    const id = profile.value.id;
    out.push({
      title: 'Online',
      rows: [
        { key: 'online', label: 'UUID', value: id },
        { key: 'online-plain', label: 'No dashes', value: undashed(id) },
        { key: 'online-int', label: 'Int array', value: intArray(id) },
      ],
    });
  }
  if (offline.value) {
    out.push({
      title: 'Offline',
      rows: [
        { key: 'offline', label: 'UUID', value: offline.value },
        { key: 'offline-plain', label: 'No dashes', value: undashed(offline.value) },
        { key: 'offline-int', label: 'Int array', value: intArray(offline.value) },
      ],
    });
  }
  return out;
});

async function look() {
  if (!valid.value || loading.value) return;
  loading.value = true;
  error.value = '';
  missing.value = false;
  profile.value = null;
  try {
    profile.value = await fetchProfile(input.value);
    missing.value = !profile.value;
  } catch (thrown) {
    error.value = thrown instanceof LookupError ? thrown.message : 'Could not reach the lookup service.';
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

watch(query, () => {
  profile.value = null;
  error.value = '';
  missing.value = false;
  syncQuery({ name: input.value || undefined });
});

onMounted(() => {
  if (valid.value) look();
});

const status = computed(() => {
  if (loading.value) return 'Looking up…';
  if (profile.value) return `${profile.value.model === 'slim' ? 'Slim' : 'Classic'} model`;
  if (missing.value) return isName.value ? 'No Mojang account; offline only' : 'No account has this UUID';
  if (offline.value) return 'Press Look up for the online UUID';
  return '';
});
</script>

<template>
	<ToolsToolPage
		title="UUID lookup"
		lead="Turn a Minecraft username into the UUID a server stores it under, or a UUID back into a name. Online UUIDs come from Mojang; offline ones are derived from the name and work without an account."
	>
		<div class="uu">
			<aside class="uu__player">
				<div class="uu__stage" :class="{ empty: !profile }">
					<img
						v-if="profile"
						:key="profile.id"
						:src="`https://crafthead.net/body/${undashed(profile.id)}`"
						:alt="`${profile.name}'s skin`"
						class="uu__body"
					/>
					<UserRound v-else :size="56" :stroke-width="1.2" class="uu__ghost" />
				</div>
				<div class="uu__who">
					<span class="uu__name">{{ profile?.name ?? (offlineName || 'Player') }}</span>
					<span class="uu__status">{{ status || 'Type a username to start' }}</span>
				</div>
				<div v-if="profile" class="uu__links">
					<a v-if="profile.skin" :href="profile.skin" target="_blank" rel="noopener">Skin</a>
					<a v-if="profile.cape" :href="profile.cape" target="_blank" rel="noopener">Cape</a>
					<a :href="`https://namemc.com/profile/${profile.id}`" target="_blank" rel="noopener">
						NameMC <ExternalLink :size="12" />
					</a>
				</div>
			</aside>

			<section class="uu__main">
				<form class="uu__search" @submit.prevent="look">
					<label class="label" for="name">Username or online UUID</label>
					<div class="uu__row">
						<input
							id="name"
							v-model="query"
							class="input"
							:class="{ bad: input && !valid }"
							autocomplete="off"
							autocapitalize="off"
							spellcheck="false"
							maxlength="36"
							placeholder="Notch"
						/>
						<button type="submit" class="btn primary" :disabled="!valid || loading">
							<Search :size="15" :stroke-width="1.9" />
							<span>{{ loading ? 'Looking up' : 'Look up' }}</span>
						</button>
					</div>
					<p v-if="input && !valid" class="hint bad">
						A username is 1 to 16 letters, digits or underscores; a UUID is 32 hex digits, dashes optional.
					</p>
					<p v-else-if="error" class="hint bad">{{ error }} The offline UUID below needs no lookup.</p>
					<p v-else class="hint">
						Online: the account's UUID, used with <code>online-mode=true</code> and behind a proxy. Offline: what
						<code>online-mode=false</code> derives from the name.
					</p>
				</form>

				<div v-if="groups.length" class="uu__groups">
					<div v-for="g in groups" :key="g.title" class="uu__group">
						<span class="label">{{ g.title }}</span>
						<ul class="uu__values">
							<li v-for="row in g.rows" :key="row.key">
								<span class="uu__label">{{ row.label }}</span>
								<code class="uu__value">{{ row.value }}</code>
								<button
									type="button"
									class="uu__copy"
									:aria-label="`Copy ${g.title.toLowerCase()} ${row.label}`"
									@click="copy(row.key, row.value)"
								>
									<component :is="copied === row.key ? Check : Copy" :size="15" :stroke-width="1.8" />
								</button>
							</li>
						</ul>
					</div>
				</div>
				<div v-else class="uu__empty">
					<p>The UUIDs appear here: dashed, without dashes, and as the int array NBT and commands use.</p>
				</div>
			</section>
		</div>
	</ToolsToolPage>
</template>

<style scoped>
.uu {
	display: grid;
	grid-template-columns: 300px minmax(0, 1fr);
	/* Fills the screen under the header, so the tool is the page rather than a strip on it. */
	min-height: max(480px, calc(100svh - 360px));
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
	overflow: hidden;
}

.uu__player {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px;
	border-right: 1px solid var(--line);
	background:
		radial-gradient(70% 50% at 50% 35%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%),
		var(--surface-1);
}

.uu__stage {
	display: grid;
	flex: 1;
	place-items: center;
	min-height: 260px;
}

.uu__body {
	width: auto;
	max-width: 100%;
	height: 260px;
	image-rendering: pixelated;
	filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.45));
}

.uu__ghost {
	color: var(--line-2);
}

.uu__who {
	display: flex;
	flex-direction: column;
	gap: 2px;
	text-align: center;
}

.uu__name {
	font: 700 18px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
	overflow-wrap: anywhere;
}

.uu__status {
	font: 400 12.5px/1.4 var(--font-mono);
	color: var(--mute);
}

.uu__links {
	display: flex;
	justify-content: center;
	gap: 16px;
}

.uu__links a {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	min-height: 32px;
	font: 500 13px/1 var(--font-sans);
	color: var(--accent);
}

.uu__main {
	display: flex;
	flex-direction: column;
	gap: 24px;
	padding: 24px;
	min-width: 0;
}

.uu__search {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.uu__row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.uu__row .input {
	flex: 1 1 240px;
}

.uu__search code {
	font: 500 12px/1 var(--font-mono);
	color: var(--fg);
}

.uu__groups {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.uu__group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.uu__values {
	margin: 0;
	padding: 0;
	list-style: none;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	overflow: hidden;
}

.uu__values li {
	display: grid;
	grid-template-columns: 110px minmax(0, 1fr) auto;
	gap: 12px;
	align-items: center;
	padding: 6px 6px 6px 14px;
	border-bottom: 1px solid var(--line);
	background: var(--surface-1);
}

.uu__values li:last-child {
	border-bottom: 0;
}

.uu__label {
	font: 500 12px/1.5 var(--font-mono);
	color: var(--mute);
}

.uu__value {
	font: 500 13px/1.5 var(--font-mono);
	color: var(--fg-hi);
	overflow-wrap: anywhere;
}

.uu__copy {
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: var(--surface-card);
	color: var(--mute);
	cursor: pointer;
}

.uu__copy:hover {
	color: var(--fg-hi);
	border-color: var(--rule);
}

.uu__empty {
	display: grid;
	flex: 1;
	place-items: center;
	padding: 24px;
	border: 1px dashed var(--line-2);
	border-radius: var(--r-3);
	text-align: center;
}

.uu__empty p {
	max-width: 40ch;
	margin: 0;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--mute);
}

@media (max-width: 820px) {
	.uu {
		grid-template-columns: minmax(0, 1fr);
		min-height: 0;
	}

	.uu__player {
		flex-direction: row;
		align-items: center;
		border-right: 0;
		border-bottom: 1px solid var(--line);
		padding: 16px;
	}

	.uu__stage {
		flex: none;
		min-height: 0;
	}

	.uu__body {
		height: 120px;
	}

	.uu__who {
		flex: 1;
		text-align: left;
	}

	.uu__links {
		flex-direction: column;
		gap: 0;
	}

	.uu__main {
		padding: 16px;
	}

	.uu__values li {
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 2px 12px;
	}

	.uu__copy {
		grid-column: 2;
		grid-row: 1 / span 2;
	}

	.uu__empty {
		min-height: 140px;
	}
}
</style>
