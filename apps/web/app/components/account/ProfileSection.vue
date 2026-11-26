<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { auth } from '~/lib/auth';

const { t } = useI18n();
const session = auth.useSession();
const user = computed(() => session.value.data?.user);
const saved = computed(() => ({
  name: user.value?.name ?? '',
  username: user.value?.displayUsername ?? user.value?.username ?? '',
}));

const name = ref(saved.value.name);
const username = ref(saved.value.username);
const busy = ref(false);
const error = ref('');
const done = ref(false);

watch(saved, now => {
  if (busy.value) return;
  name.value = now.name;
  username.value = now.username;
});

const nameValid = computed(() => name.value.trim().length <= 40);
const usernameValid = computed(() => /^[a-zA-Z0-9_.]{3,30}$/.test(username.value.trim()));
const changed = computed(
  () => name.value.trim() !== saved.value.name || username.value.trim() !== saved.value.username,
);

async function save() {
  if (!nameValid.value || !usernameValid.value || !changed.value || busy.value) return;
  busy.value = true;
  error.value = '';
  done.value = false;
  const next = { name: name.value.trim(), username: username.value.trim() };
  const { error: failed } = await auth.updateUser(
    next.username === saved.value.username
      ? { name: next.name }
      : { name: next.name, username: next.username, displayUsername: next.username },
  );
  busy.value = false;
  if (failed) {
    error.value =
      failed.code === 'USERNAME_IS_ALREADY_TAKEN'
        ? t('account.profile.taken')
        : (failed.message ?? t('account.profile.failed'));
    return;
  }
  done.value = true;
}

function reset() {
  name.value = saved.value.name;
  username.value = saved.value.username;
  error.value = '';
  done.value = false;
}
</script>

<template>
	<AccountSection
		id="profile"
		:title="$t('account.profile.title')"
		:lead="$t('account.profile.lede', { email: user?.email ?? '' })"
	>
		<form class="pf" @submit.prevent="save">
			<label class="pf__field">
				<span class="label">{{ $t('account.profile.displayName') }}</span>
				<input
					v-model="name"
					class="input"
					autocomplete="nickname"
					maxlength="40"
					:placeholder="username || $t('account.profile.yourName')"
					@input="done = false"
				/>
			</label>
			<label class="pf__field">
				<span class="label">{{ $t('account.profile.username') }}</span>
				<input
					v-model="username"
					class="input"
					autocomplete="username"
					autocapitalize="off"
					spellcheck="false"
					maxlength="30"
					:placeholder="$t('account.profile.pick')"
					@input="done = false"
				/>
			</label>

			<div class="pf__foot">
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
				<p v-else-if="done" class="hint">{{ $t('account.profile.saved') }}</p>
				<p v-else class="hint">{{ $t('account.profile.rule') }}</p>
				<div class="pf__actions">
					<button v-if="changed" type="button" class="btn quiet small" @click="reset">{{ $t('account.profile.reset') }}</button>
					<button type="submit" class="btn primary small" :disabled="!nameValid || !usernameValid || !changed || busy">
						{{ busy ? $t('account.profile.saving') : $t('account.profile.save') }}
					</button>
				</div>
			</div>
		</form>
	</AccountSection>
</template>

<style scoped>
.pf {
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
}

.pf__field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.pf__foot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--s-3);
	margin-top: auto;
}

.pf__actions {
	display: flex;
	gap: var(--s-2);
}
</style>
