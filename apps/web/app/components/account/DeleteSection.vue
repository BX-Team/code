<script setup lang="ts">
import { computed, ref } from 'vue';
import { auth } from '~/lib/auth';

const session = auth.useSession();
/** Typing this back confirms the deletion: the username, or the email when there is none. */
const phrase = computed(() => {
  const user = session.value.data?.user;
  return user?.displayUsername ?? user?.username ?? user?.email ?? '';
});

const asking = ref(false);
const typed = ref('');
const busy = ref(false);
const error = ref('');
const stale = ref(false);

const matches = computed(() => typed.value.trim().toLowerCase() === phrase.value.toLowerCase());

async function remove() {
  if (!matches.value || busy.value) return;
  busy.value = true;
  error.value = '';
  const { error: failed } = await auth.deleteUser({});
  busy.value = false;
  if (failed) {
    stale.value = failed.code === 'SESSION_EXPIRED';
    error.value = stale.value
      ? 'For safety, sign in again first: deleting needs a sign-in from the last day.'
      : (failed.message ?? 'Could not delete the account.');
    return;
  }
  navigateTo('/');
}

async function signInAgain() {
  await auth.signOut();
  navigateTo(`/login?next=${encodeURIComponent('/account/security')}`);
}
</script>

<template>
	<AccountSection id="delete" title="Delete BX ID">
		<div class="del">
			<p class="del__text">
				Removes this account, its sign-in methods, friends and skins, and signs out every
				device. Apps you used lose what they kept for it. This cannot be undone.
			</p>
			<button v-if="!asking" type="button" class="btn small del__go" @click="asking = true">Delete BX ID</button>
		</div>

		<form v-if="asking" class="form del__form" @submit.prevent="remove">
			<label class="label" for="delete-confirm">Type <span class="del__phrase">{{ phrase }}</span> to confirm</label>
			<div class="row">
				<input
					id="delete-confirm"
					v-model="typed"
					class="input"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
				/>
				<button type="button" class="btn quiet" @click="(asking = false), (typed = ''), (error = '')">Cancel</button>
				<button type="submit" class="btn del__confirm" :disabled="!matches || busy">
					{{ busy ? 'Deleting…' : 'Delete forever' }}
				</button>
			</div>
			<p v-if="error" class="hint bad" role="alert">
				{{ error }}
				<button v-if="stale" type="button" class="link" @click="signInAgain">Sign in again</button>
			</p>
		</form>
	</AccountSection>
</template>

<style scoped>
.del {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--s-3) var(--s-6);
}

.del__text {
	flex: 1 1 360px;
	margin: 0;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--mute);
}

.bxid .del__go,
.bxid .del__confirm:not(:disabled) {
	color: var(--err);
}

.bxid .del__confirm:not(:disabled) {
	border-color: color-mix(in srgb, var(--err) 55%, var(--line-2));
}

.del__phrase {
	font-family: var(--font-mono);
	text-transform: none;
	letter-spacing: 0;
	color: var(--fg-hi);
}
</style>
