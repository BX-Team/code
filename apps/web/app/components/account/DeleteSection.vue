<script setup lang="ts">
import { computed, ref } from 'vue';
import { auth } from '~/lib/auth';

const { t } = useI18n();
const errorText = useErrorText();
const sitePath = useSitePath();
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
    error.value = stale.value ? t('account.delete.stale') : errorText(failed);
    return;
  }
  navigateTo(sitePath('/'));
}

async function signInAgain() {
  await auth.signOut();
  navigateTo(`${sitePath('/login')}?next=${encodeURIComponent(sitePath('/account/security'))}`);
}
</script>

<template>
	<AccountSection id="delete" :title="$t('account.delete.title')">
		<div class="del">
			<p class="del__text">{{ $t('account.delete.body') }}</p>
			<button v-if="!asking" type="button" class="btn small del__go" @click="asking = true">{{ $t('account.delete.title') }}</button>
		</div>

		<form v-if="asking" class="form del__form" @submit.prevent="remove">
			<i18n-t keypath="account.delete.confirm" tag="label" class="label" for="delete-confirm" scope="global">
				<template #phrase><span class="del__phrase">{{ phrase }}</span></template>
			</i18n-t>
			<div class="row">
				<input
					id="delete-confirm"
					v-model="typed"
					class="input"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
				/>
				<button type="button" class="btn quiet" @click="(asking = false), (typed = ''), (error = '')">{{ $t('account.delete.cancel') }}</button>
				<button type="submit" class="btn del__confirm" :disabled="!matches || busy">
					{{ busy ? $t('account.delete.deleting') : $t('account.delete.forever') }}
				</button>
			</div>
			<p v-if="error" class="hint bad" role="alert">
				{{ error }}
				<button v-if="stale" type="button" class="link" @click="signInAgain">{{ $t('account.delete.again') }}</button>
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
