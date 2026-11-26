<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { APPS, auth } from '~/lib/auth';

const { t } = useI18n();
const sitePath = useSitePath();

useHead({ title: () => t('account.device.title') });

const route = useRoute();
const session = auth.useSession();
const { refresh } = useAccountData();

const code = ref(typeof route.query.user_code === 'string' ? route.query.user_code : '');
const step = ref<'enter' | 'review' | 'approved' | 'denied'>('enter');
const client = ref('');
const busy = ref(false);
const error = ref('');

/** The server drops dashes and case, so the code is accepted as the launcher shows it. */
const userCode = computed(() => code.value.replace(/[^a-z0-9]/gi, '').toUpperCase());

const who = computed(() => {
  const user = session.value.data?.user;
  return user ? user.name || user.email : '';
});

// The account shell renders this page only with a session, so a code from the link can be checked at once.
onMounted(() => {
  if (userCode.value) check();
});

async function check() {
  if (!userCode.value || busy.value) return;
  busy.value = true;
  error.value = '';
  // Asking with a session claims the code for this account; only then may it be approved.
  const { data, error: failed } = await auth.device({ query: { user_code: userCode.value } });
  busy.value = false;
  if (failed || !data) {
    error.value = t('account.device.wrong');
    return;
  }
  if (data.status !== 'pending' || !data.client_id) {
    error.value = t('account.device.used');
    return;
  }
  client.value = APPS[data.client_id]?.name ?? data.client_id;
  step.value = 'review';
}

async function answer(approve: boolean) {
  busy.value = true;
  error.value = '';
  const body = { userCode: userCode.value };
  const { error: failed } = approve ? await auth.device.approve(body) : await auth.device.deny(body);
  busy.value = false;
  if (failed) {
    error.value = t('account.device.expired');
    step.value = 'enter';
    return;
  }
  step.value = approve ? 'approved' : 'denied';
  // The app picks its session up on its next poll, a few seconds later.
  if (approve) setTimeout(refresh, 6000);
}

function again() {
  code.value = '';
  error.value = '';
  step.value = 'enter';
}
</script>

<template>
	<div class="dv">
		<AccountSection
			v-if="step === 'enter'"
			id="device"
			:title="$t('account.device.title')"
			:lead="$t('account.device.lede')"
		>
			<form class="form" @submit.prevent="check">
				<label class="label" for="code">{{ $t('account.device.code') }}</label>
				<input
					id="code"
					v-model="code"
					class="input code"
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					maxlength="16"
					placeholder="ABCD-EFGH"
					required
				/>
				<button type="submit" class="btn primary block" :disabled="!userCode || busy">
					{{ busy ? $t('account.device.checking') : $t('account.device.continue') }}
				</button>
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
			</form>
		</AccountSection>

		<AccountSection
			v-else-if="step === 'review'"
			id="device"
			:title="$t('account.device.ask', { app: client })"
			:lead="$t('account.device.askLede', { app: client, who })"
		>
			<div class="form">
				<button type="button" class="btn primary block" :disabled="busy" @click="answer(true)">{{ $t('account.device.approve') }}</button>
				<button type="button" class="btn block" :disabled="busy" @click="answer(false)">{{ $t('account.device.deny') }}</button>
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
			</div>
		</AccountSection>

		<AccountSection
			v-else
			id="device"
			:title="step === 'approved' ? $t('account.device.connected') : $t('account.device.denied')"
			:lead="
				step === 'approved'
					? $t('account.device.connectedLede', { app: client, who })
					: $t('account.device.deniedLede', { app: client })
			"
		>
			<div class="form">
				<NuxtLink :to="sitePath('/account/security')" class="btn block">{{ $t('account.device.see') }}</NuxtLink>
				<button type="button" class="link" @click="again">{{ $t('account.device.another') }}</button>
			</div>
		</AccountSection>
	</div>
</template>

<style scoped>
.dv {
	box-sizing: border-box;
	width: 100%;
	max-width: 480px;
	margin: 0 auto;
}
</style>
