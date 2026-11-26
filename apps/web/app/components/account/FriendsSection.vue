<script setup lang="ts">
import type { Friend, Friends, PlayUser } from '@bx-team/types/schema/play';
import { UserPlus } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { acceptFriend, addFriend, fetchFriends, PlayError, playerName, removeFriend } from '~/lib/play';

const { t } = useI18n();
const data = ref<Friends | null>(null);
const loadError = ref('');
const code = ref('');
const adding = ref(false);
const addNote = ref<{ text: string; bad: boolean } | null>(null);
const busy = ref('');
/** Removing a friend asks once more on the same button instead of opening a dialog. */
const confirming = ref('');

const sorted = computed(() =>
  [...(data.value?.friends ?? [])].sort(
    (a, b) => Number(b.presence.online) - Number(a.presence.online) || label(a.user).localeCompare(label(b.user)),
  ),
);
const online = computed(() => sorted.value.filter(f => f.presence.online).length);

onMounted(load);
useLiveFriends(data, load);

async function load() {
  loadError.value = '';
  try {
    data.value = await fetchFriends();
  } catch {
    loadError.value = t('account.friends.unreachable');
  }
}

function label(user: PlayUser) {
  return playerName(user);
}

function status(friend: Friend) {
  const { online, activity } = friend.presence;
  if (!online) return t('account.friends.offline');
  if (!activity) return t('account.friends.onlineRiven');
  return t('account.friends.playing', { name: activity.name, minecraft: activity.minecraft });
}

async function add() {
  const typed = code.value.trim();
  if (!typed || adding.value) return;
  adding.value = true;
  addNote.value = null;
  try {
    const result = await addFriend(typed);
    const who = label(result.user);
    addNote.value = {
      text: t(
        result.status === 'accepted'
          ? 'account.friends.accepted'
          : result.status === 'exists'
            ? 'account.friends.exists'
            : 'account.friends.asked',
        { who },
      ),
      bad: false,
    };
    code.value = '';
    await load();
  } catch (error) {
    addNote.value = { text: error instanceof PlayError ? error.message : t('account.friends.sendFailed'), bad: true };
  } finally {
    adding.value = false;
  }
}

async function act(id: string, action: () => Promise<void>) {
  busy.value = id;
  try {
    await action();
    await load();
  } catch {
    loadError.value = t('account.friends.failed');
  } finally {
    busy.value = '';
    confirming.value = '';
  }
}

function remove(id: string) {
  if (confirming.value !== id) {
    confirming.value = id;
    return;
  }
  act(id, () => removeFriend(id));
}
</script>

<template>
	<AccountSection
		id="friends"
		:title="$t('account.friends.title')"
		:lead="
			data
				? `${$t('account.friends.count', { n: data.friends.length, online }, data.friends.length)} ${$t('account.friends.lede')}`
				: $t('account.friends.lede')
		"
	>
		<form class="form" @submit.prevent="add">
			<label class="label" for="friend">{{ $t('account.friends.addLabel') }}</label>
			<div class="row">
				<input
					id="friend"
					v-model="code"
					class="input"
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					maxlength="20"
					placeholder="K7F2-9QXM"
				/>
				<button type="submit" class="btn" :disabled="!code.trim() || adding">
					<UserPlus :size="16" :stroke-width="1.8" />
					{{ adding ? $t('account.friends.sending') : $t('account.friends.add') }}
				</button>
			</div>
			<p v-if="addNote" class="hint" :class="{ bad: addNote.bad }" role="status">{{ addNote.text }}</p>
		</form>

		<template v-if="data">
			<div v-if="data.incoming.length" class="group">
				<span class="label">{{ $t('account.friends.incoming') }}</span>
				<ul class="list">
					<li v-for="user in data.incoming" :key="user.id">
						<AccountAvatar :id="user.id" :name="label(user)" :image="user.image" :size="36" />
						<div class="grow">
							<span class="name">{{ label(user) }}</span>
						</div>
						<div class="actions">
							<button type="button" class="btn primary small" :disabled="busy === user.id" @click="act(user.id, () => acceptFriend(user.id))">
								{{ $t('account.friends.accept') }}
								</button>
							<button type="button" class="btn quiet small" :disabled="busy === user.id" @click="act(user.id, () => removeFriend(user.id))">
								{{ $t('account.friends.decline') }}
								</button>
						</div>
					</li>
				</ul>
			</div>

			<span v-if="sorted.length && (data.incoming.length || data.outgoing.length)" class="label">{{ $t('account.friends.title') }}</span>
			<ul v-if="sorted.length" class="list">
				<li v-for="friend in sorted" :key="friend.user.id">
					<span class="who">
						<AccountAvatar :id="friend.user.id" :name="label(friend.user)" :image="friend.user.image" :size="36" />
						<span class="dot" :class="{ on: friend.presence.online }" :title="friend.presence.online ? $t('account.friends.online') : $t('account.friends.offline')" />
					</span>
					<div class="grow">
						<span class="name">{{ label(friend.user) }}</span>
						<span class="sub" :class="{ live: friend.presence.online }">{{ status(friend) }}</span>
					</div>
					<div class="actions">
						<button
							type="button"
							class="btn quiet small danger"
							:disabled="busy === friend.user.id"
							@click="remove(friend.user.id)"
							@blur="confirming = ''"
						>
							{{ confirming === friend.user.id ? $t('account.friends.removeConfirm') : $t('account.friends.remove') }}
						</button>
					</div>
				</li>
			</ul>
			<p v-else-if="!data.incoming.length" class="empty">{{ $t('account.friends.none') }}</p>

			<div v-if="data.outgoing.length" class="group">
				<span class="label">{{ $t('account.friends.outgoing') }}</span>
				<ul class="list">
					<li v-for="user in data.outgoing" :key="user.id">
						<AccountAvatar :id="user.id" :name="label(user)" :image="user.image" :size="36" />
						<div class="grow">
							<span class="name">{{ label(user) }}</span>
						</div>
						<div class="actions">
							<button type="button" class="btn quiet small" :disabled="busy === user.id" @click="act(user.id, () => removeFriend(user.id))">
								{{ $t('account.friends.cancel') }}
								</button>
						</div>
					</li>
				</ul>
			</div>
		</template>

		<p v-if="loadError" class="hint bad" role="alert">
			{{ loadError }}
			<button type="button" class="link" @click="load">{{ $t('account.friends.retry') }}</button>
		</p>
	</AccountSection>
</template>

<style scoped>
.group {
	display: flex;
	flex-direction: column;
	gap: var(--s-2);
}

.who {
	position: relative;
	flex: none;
	line-height: 0;
}

.dot {
	position: absolute;
	right: -1px;
	bottom: -1px;
	width: 11px;
	height: 11px;
	border: 2px solid var(--surface-1);
	border-radius: var(--r-pill);
	background: var(--rule);
}

.dot.on {
	background: var(--ok);
}

.sub.live {
	color: var(--dim);
}
</style>
