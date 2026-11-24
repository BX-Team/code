<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import discordSvgRaw from '~/assets/external/discord.svg?raw';
import githubSvgRaw from '~/assets/external/github.svg?raw';
import { auth, safeNext } from '~/lib/auth';
import { mountTurnstile } from '~/lib/turnstile';

useHead({ title: 'Sign in' });

const route = useRoute();
const session = auth.useSession();

const next = computed(() => safeNext(route.query.next));

const step = ref<'email' | 'code'>('email');
const email = ref('');
const otp = ref('');
const busy = ref(false);
const error = ref(typeof route.query.error === 'string' ? 'Signing in did not go through. Try again.' : '');

const title = computed(() => (step.value === 'code' ? 'Check your email' : 'Sign in to BX ID'));
const lead = computed(() =>
  step.value === 'code' ? `We sent a 6-digit code to ${email.value.trim()}. It works for 5 minutes.` : undefined,
);

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));
const otpValid = computed(() => /^\d{6}$/.test(otp.value.trim()));

const captchaEl = ref<HTMLElement>();
const captcha = ref<string | null>(null);
let widget: Awaited<ReturnType<typeof mountTurnstile>> | undefined;

watch(
  captchaEl,
  async el => {
    widget?.remove();
    widget = undefined;
    if (!el) return;
    try {
      widget = await mountTurnstile(el, token => {
        captcha.value = token;
      });
    } catch {
      error.value = 'The bot check did not load. Reload the page, or sign in with Discord or GitHub.';
    }
  },
  { flush: 'post' },
);

onBeforeUnmount(() => widget?.remove());

watch(
  () => session.value.data,
  data => {
    if (data) navigateTo(next.value, { replace: true });
  },
  { immediate: true },
);

async function sendCode() {
  if (!emailValid.value || !captcha.value || busy.value) return;
  busy.value = true;
  error.value = '';
  const { error: failed } = await auth.emailOtp.sendVerificationOtp(
    { email: email.value.trim(), type: 'sign-in' },
    { headers: { 'x-captcha-response': captcha.value } },
  );
  // A Turnstile token passes once, so every attempt needs a fresh one.
  widget?.reset();
  busy.value = false;
  if (failed) {
    error.value = failed.status === 429 ? 'Too many codes asked for. Wait a minute.' : 'Could not send the code.';
    return;
  }
  otp.value = '';
  step.value = 'code';
}

async function signIn() {
  if (!otpValid.value || busy.value) return;
  busy.value = true;
  error.value = '';
  const { error: failed } = await auth.signIn.emailOtp({ email: email.value.trim(), otp: otp.value.trim() });
  busy.value = false;
  if (failed) {
    error.value = failed.status === 429 ? 'Too many attempts. Wait a minute.' : 'That code is wrong or has expired.';
  }
}

async function social(provider: 'discord' | 'github') {
  busy.value = true;
  error.value = '';
  const { error: failed } = await auth.signIn.social({
    provider,
    callbackURL: `${location.origin}${next.value}`,
    errorCallbackURL: `${location.origin}/login?next=${encodeURIComponent(next.value)}`,
  });
  if (failed) {
    busy.value = false;
    error.value = 'Could not start signing in.';
  }
}
</script>

<template>
	<AccountCard pitch :title="title" :lead="lead">
		<template v-if="session.isPending || session.data" />

		<template v-else-if="step === 'email'">
			<div class="form">
				<button type="button" class="btn block" :disabled="busy" @click="social('discord')">
					<span aria-hidden="true" v-html="discordSvgRaw" />
					Continue with Discord
				</button>
				<button type="button" class="btn block" :disabled="busy" @click="social('github')">
					<span aria-hidden="true" v-html="githubSvgRaw" />
					Continue with GitHub
				</button>
			</div>

			<div class="divider">or</div>

			<form class="form" @submit.prevent="sendCode">
				<label class="label" for="email">Email</label>
				<input
					id="email"
					v-model="email"
					class="input"
					type="email"
					autocomplete="email"
					inputmode="email"
					placeholder="you@example.com"
					required
				/>
				<div ref="captchaEl" class="captcha" />
				<button type="submit" class="btn primary block" :disabled="!emailValid || !captcha || busy">
					{{ busy ? 'Sending…' : 'Email me a code' }}
				</button>
				<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
			</form>

			<p class="hint terms">A new BX ID is made the first time you sign in.</p>
		</template>

		<form v-else class="form" @submit.prevent="signIn">
			<label class="label" for="otp">Code</label>
			<input
				id="otp"
				v-model="otp"
				class="input code"
				autocomplete="one-time-code"
				inputmode="numeric"
				maxlength="6"
				placeholder="000000"
				required
			/>
			<button type="submit" class="btn primary block" :disabled="!otpValid || busy">
				{{ busy ? 'Signing in…' : 'Sign in' }}
			</button>
			<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
			<button type="button" class="link" @click="step = 'email'">Use another email or send a new code</button>
		</form>
	</AccountCard>
</template>

<style scoped>
.captcha {
	border-radius: var(--r-2);
	overflow: hidden;
}

.terms {
	text-align: center;
}
</style>
