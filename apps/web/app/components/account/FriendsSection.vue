<script setup lang="ts">
import type { Friend, Friends, PlayUser } from '@bx-team/types/schema/play';
import { UserPlus } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { acceptFriend, addFriend, fetchFriends, PlayError, playerName, removeFriend } from '~/lib/play';

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
    loadError.value = 'Friends are not reachable right now. Try again in a minute.';
  }
}

function label(user: PlayUser) {
  return playerName(user);
}

function status(friend: Friend) {
  const { online, activity } = friend.presence;
  if (!online) return 'Offline';
  if (!activity) return 'Online in Riven';
  return `Playing ${activity.name} · ${activity.minecraft}`;
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
      text:
        result.status === 'accepted'
          ? `You and ${who} are friends now.`
          : result.status === 'exists'
            ? `You have already asked ${who}, or you are friends.`
            : `Asked ${who}. They will see it next time they open Riven or this page.`,
      bad: false,
    };
    code.value = '';
    await load();
  } catch (error) {
    addNote.value = { text: error instanceof PlayError ? error.message : 'Could not send the request.', bad: true };
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
    loadError.value = 'That did not go through. Try again.';
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
		title="Friends"
		:lead="
			data
				? `${data.friends.length} ${data.friends.length === 1 ? 'friend' : 'friends'}, ${online} online. Friends see when you are in Riven and can invite you into their world.`
				: 'Friends see when you are in Riven and can invite you into their world.'
		"
	>
		<form class="form" @submit.prevent="add">
			<label class="label" for="friend">Add by friend code</label>
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
					{{ adding ? 'Sending…' : 'Add friend' }}
				</button>
			</div>
			<p v-if="addNote" class="hint" :class="{ bad: addNote.bad }" role="status">{{ addNote.text }}</p>
		</form>

		<template v-if="data">
			<div v-if="data.incoming.length" class="group">
				<span class="label">Asking to be friends</span>
				<ul class="list">
					<li v-for="user in data.incoming" :key="user.id">
						<AccountAvatar :id="user.id" :name="label(user)" :image="user.image" :size="36" />
						<div class="grow">
							<span class="name">{{ label(user) }}</span>
						</div>
						<div class="actions">
							<button type="button" class="btn primary small" :disabled="busy === user.id" @click="act(user.id, () => acceptFriend(user.id))">
								Accept
							</button>
							<button type="button" class="btn quiet small" :disabled="busy === user.id" @click="act(user.id, () => removeFriend(user.id))">
								Decline
							</button>
						</div>
					</li>
				</ul>
			</div>

			<span v-if="sorted.length && (data.incoming.length || data.outgoing.length)" class="label">Friends</span>
			<ul v-if="sorted.length" class="list">
				<li v-for="friend in sorted" :key="friend.user.id">
					<span class="who">
						<AccountAvatar :id="friend.user.id" :name="label(friend.user)" :image="friend.user.image" :size="36" />
						<span class="dot" :class="{ on: friend.presence.online }" :title="friend.presence.online ? 'Online' : 'Offline'" />
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
							{{ confirming === friend.user.id ? 'Remove?' : 'Remove' }}
						</button>
					</div>
				</li>
			</ul>
			<p v-else-if="!data.incoming.length" class="empty">No friends yet. Add someone by their friend code.</p>

			<div v-if="data.outgoing.length" class="group">
				<span class="label">Waiting for an answer</span>
				<ul class="list">
					<li v-for="user in data.outgoing" :key="user.id">
						<AccountAvatar :id="user.id" :name="label(user)" :image="user.image" :size="36" />
						<div class="grow">
							<span class="name">{{ label(user) }}</span>
						</div>
						<div class="actions">
							<button type="button" class="btn quiet small" :disabled="busy === user.id" @click="act(user.id, () => removeFriend(user.id))">
								Cancel
							</button>
						</div>
					</li>
				</ul>
			</div>
		</template>

		<p v-if="loadError" class="hint bad" role="alert">
			{{ loadError }}
			<button type="button" class="link" @click="load">Retry</button>
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
