<script setup lang="ts">
import type { Friend, Friends } from '@bx-team/types/schema/play';
import type { Profile } from '@bx-team/types/schema/skins';
import { ArrowRight } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { fetchFriends, playerName } from '~/lib/play';
import { fetchProfiles } from '~/lib/skins';

/** Riven Launcher on the overview: the nicks, a skin and who is online, at a glance. */
const props = defineProps<{ connectedAt: string }>();

const connected = computed(() =>
  new Date(props.connectedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }),
);

const nicks = ref<Profile[]>([]);
const friends = ref<Friends | null>(null);
const loaded = ref(false);

onMounted(async () => {
  const [mine, list] = await Promise.all([fetchProfiles().catch(() => null), fetchFriends().catch(() => null)]);
  nicks.value = mine?.profiles ?? [];
  friends.value = list;
  loaded.value = true;
});
useLiveFriends(friends, async () => {
  friends.value = await fetchFriends().catch(() => friends.value);
});

/** The first nick that wears a skin stands for the account. */
const skin = computed(() => nicks.value.find(n => n.skin)?.skin ?? null);
const skinUrl = computed(() => skin.value?.url ?? null);

const online = computed(() =>
  (friends.value?.friends ?? [])
    .filter(f => f.presence.online)
    .sort((a, b) => Number(!!b.presence.activity) - Number(!!a.presence.activity)),
);
const shown = computed(() => online.value.slice(0, 4));
const total = computed(() => friends.value?.friends.length ?? 0);
const asking = computed(() => friends.value?.incoming.length ?? 0);

function status(friend: Friend) {
  const { activity, status: mode } = friend.presence;
  if (activity) return `Playing ${activity.name} · ${activity.minecraft}`;
  return mode === 'busy' ? 'Busy' : 'In the launcher';
}
</script>

<template>
	<section class="rc">
		<div class="rc__stage">
			<AccountSkinFigure v-if="skinUrl" :url="skinUrl" :slim="skin?.model === 'slim'" :scale="7" />
			<span v-else-if="loaded" class="rc__none">No skin yet</span>
		</div>

		<div class="rc__body">
			<header class="rc__head">
				<div>
					<span class="label">App</span>
					<h2 class="rc__title">Riven Launcher</h2>
					<p class="rc__meta">Connected {{ connected }}</p>
				</div>
				<NuxtLink to="/account/riven" class="btn small">
					Open
					<ArrowRight :size="15" :stroke-width="1.8" />
				</NuxtLink>
			</header>

			<dl class="rc__facts">
				<div>
					<dt>Friends</dt>
					<dd>
						{{ loaded ? total : '…' }}<template v-if="online.length">
							· <span class="rc__on">{{ online.length }} online</span></template
						>
					</dd>
				</div>
				<div>
					<dt>Nicks</dt>
					<dd>
						{{ !loaded ? '…' : nicks.map(n => n.name).join(', ') || 'None yet' }}
					</dd>
				</div>
			</dl>

			<NuxtLink v-if="asking" to="/account/riven#friends" class="rc__ask">
				{{ asking }} {{ asking === 1 ? 'person wants' : 'people want' }} to be friends
				<ArrowRight :size="14" :stroke-width="1.8" />
			</NuxtLink>

			<div class="rc__friends">
				<span class="label">Online now</span>
				<ul v-if="shown.length" class="list">
					<li v-for="friend in shown" :key="friend.user.id">
						<AccountAvatar :id="friend.user.id" :name="playerName(friend.user)" :image="friend.user.image" :size="32" />
						<div class="grow">
							<span class="name">{{ playerName(friend.user) }}</span>
							<span class="sub">{{ status(friend) }}</span>
						</div>
					</li>
				</ul>
				<p v-else-if="loaded" class="hint">
					{{ total ? 'None of your friends are online right now.' : 'No friends yet. Add them by friend code in Riven.' }}
				</p>
			</div>
		</div>
	</section>
</template>

<style scoped>
.rc {
	display: flex;
	flex-wrap: wrap;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
}

.rc__stage {
	display: grid;
	flex: 1 1 240px;
	max-width: 280px;
	min-height: 300px;
	place-items: center;
	border-right: 1px solid var(--line);
	background: radial-gradient(circle at 50% 35%, var(--surface-2), var(--surface-deep));
}

.rc__none {
	font: 400 13px/1.4 var(--font-sans);
	color: var(--mute);
}

.rc__body {
	display: flex;
	flex: 999 1 360px;
	flex-direction: column;
	gap: var(--s-4);
	min-width: 0;
	padding: var(--s-5) var(--s-6);
}

.rc__head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--s-3);
}

.rc__title {
	margin: 2px 0 0;
	font: 700 20px/1.2 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.rc__meta {
	margin: 2px 0 0;
	font: 400 13px/1.5 var(--font-sans);
	color: var(--mute);
}

.rc__facts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 1px;
	margin: 0;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--line);
}

.rc__facts div {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: var(--s-3) var(--s-4);
	background: var(--surface-1);
}

.rc__facts dt {
	font: 400 12.5px/1.4 var(--font-sans);
	color: var(--mute);
}

.rc__facts dd {
	margin: 0;
	font: 600 14.5px/1.35 var(--font-sans);
	color: var(--fg-hi);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rc__on {
	color: var(--ok);
}

.rc__ask {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	gap: 6px;
	min-height: 36px;
	padding: 0 12px;
	border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line-2));
	border-radius: var(--r-2);
	background: color-mix(in srgb, var(--accent) 8%, transparent);
	font: 500 13px/1 var(--font-sans);
	color: var(--fg-hi);
	text-decoration: none;
}

.rc__friends {
	display: flex;
	flex-direction: column;
	gap: var(--s-2);
}

@media (max-width: 640px) {
	.rc__stage {
		max-width: none;
		border-right: 0;
		border-bottom: 1px solid var(--line);
	}
}
</style>
