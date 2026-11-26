<script setup lang="ts">
import type { DeviceOrigin } from '@bx-team/types/schema/bxid';
import { MapPin, TriangleAlert } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { describeAgent } from '~/lib/agents';
import { APPS, auth, fetchDeviceOrigin } from '~/lib/auth';

const { t } = useI18n();
const sitePath = useSitePath();
const format = useFormat();
const errorText = useErrorText();

useHead({ title: () => t('account.device.title') });

const route = useRoute();
const session = auth.useSession();
const { sessions, refresh } = useAccountData();

const dashed = (raw: string) => {
  const chars = raw
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 8);
  return chars.length > 4 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars;
};

const code = ref(dashed(typeof route.query.user_code === 'string' ? route.query.user_code : ''));
watch(code, value => {
  const shown = dashed(value);
  if (shown !== value) code.value = shown;
});
const step = ref<'enter' | 'review' | 'approved' | 'denied'>('enter');
const client = ref('');
const origin = ref<DeviceOrigin | null>(null);

const asked = computed(() => {
  const request = origin.value?.request;
  if (!request) return null;
  return {
    place: format.place(request.city, request.country) ?? request.ipAddress ?? t('account.place.unknown'),
    device: request.userAgent ? describeAgent(request.userAgent, t).name : null,
    when: format.relative(request.createdAt),
  };
});

/** A code someone else sent is the attack this page guards against; their country rarely matches the approver's. */
const elsewhere = computed(() => {
  const { request, here } = origin.value ?? {};
  return !!request?.country && !!here?.country && request.country !== here.country;
});
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
    error.value = failed?.status === 429 ? errorText(failed) : t('account.device.wrong');
    return;
  }
  if (data.status !== 'pending' || !data.client_id) {
    error.value = t('account.device.used');
    return;
  }
  client.value = APPS[data.client_id]?.name ?? data.client_id;
  // The page works without it.
  origin.value = await fetchDeviceOrigin(userCode.value).catch(() => null);
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
  if (approve) awaitNewSession();
}

/** The app picks its session up on its next poll; the device lists update once it has. */
async function awaitNewSession() {
  if (!sessions.value) await refresh();
  const known = new Set((sessions.value ?? []).map(s => s.id));
  for (let tries = 0; tries < 20; tries++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refresh();
    if (sessions.value?.some(s => !known.has(s.id))) return;
  }
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
					maxlength="12"
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
			<div class="dv__origin" :class="{ bad: elsewhere }">
				<template v-if="asked">
					<p class="dv__where">
						<MapPin :size="16" :stroke-width="1.8" />
						<span>
							<strong>{{ $t('account.device.from', { place: asked.place }) }}</strong>
							<span class="dv__sub">{{ [asked.device, asked.when].filter(Boolean).join(' · ') }}</span>
						</span>
					</p>
					<p v-if="elsewhere" class="dv__warn" role="alert">
						<TriangleAlert :size="16" :stroke-width="1.8" />
						<span>{{ $t('account.device.elsewhere') }}</span>
					</p>
				</template>
				<p v-else class="dv__sub">{{ $t('account.device.noOrigin') }}</p>
			</div>
			<div class="form">
				<button type="button" class="btn block" :class="{ primary: !elsewhere }" :disabled="busy" @click="answer(true)">{{ $t('account.device.approve') }}</button>
				<button type="button" class="btn block" :disabled="busy" @click="answer(false)" :class="{ primary: elsewhere }">{{ $t('account.device.deny') }}</button>
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

.dv__origin {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 14px 16px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-1);
}

.dv__origin.bad {
	border-color: color-mix(in srgb, var(--err) 55%, var(--line));
	background: color-mix(in srgb, var(--err) 7%, var(--surface-1));
}

.dv__where,
.dv__warn {
	display: flex;
	gap: 10px;
	margin: 0;
}

.dv__where svg {
	flex: none;
	margin-top: 2px;
	color: var(--accent);
}

.dv__where > span {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.dv__where strong {
	font: 600 14px/1.4 var(--font-sans);
	color: var(--fg-hi);
}

.dv__sub {
	margin: 0;
	font: 400 13px/1.5 var(--font-sans);
	color: var(--mute);
}

.dv__warn {
	font: 400 13px/1.55 var(--font-sans);
	color: var(--fg);
}

.dv__warn svg {
	flex: none;
	margin-top: 2px;
	color: var(--err);
}
</style>
