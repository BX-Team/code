<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { APPS, auth } from '~/lib/auth';

useHead({ title: 'Connect a device' });

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
    error.value = 'That code is wrong or has expired. Start signing in again in the app.';
    return;
  }
  if (data.status !== 'pending' || !data.client_id) {
    error.value = 'That code has already been used.';
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
    error.value = 'That code has expired or was already used. Start signing in again in the app.';
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
			title="Connect a device"
			lead="Signing in to a BX Team app on another device? Enter the code it shows."
		>
			<form class="form" @submit.prevent="check">
				<label class="label" for="code">Code</label>
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
					{{ busy ? 'Checking…' : 'Continue' }}
				</button>
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
			</form>
		</AccountSection>

		<AccountSection
			v-else-if="step === 'review'"
			id="device"
			:title="`Sign in to ${client}?`"
			:lead="`${client} will be signed in as ${who}. Approve only if you started this yourself, on your own device.`"
		>
			<div class="form">
				<button type="button" class="btn primary block" :disabled="busy" @click="answer(true)">Approve</button>
				<button type="button" class="btn block" :disabled="busy" @click="answer(false)">Deny</button>
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
			</div>
		</AccountSection>

		<AccountSection
			v-else
			id="device"
			:title="step === 'approved' ? 'Device connected' : 'Request denied'"
			:lead="
				step === 'approved'
					? `${client} is signed in as ${who}. You can go back to it now.`
					: `${client} was not signed in.`
			"
		>
			<div class="form">
				<NuxtLink to="/account/security" class="btn block">See your devices</NuxtLink>
				<button type="button" class="link" @click="again">Connect another device</button>
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
