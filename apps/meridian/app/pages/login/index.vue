<script setup lang="ts">
import { BrandMark, Button } from '@bx-team/ui'
import { authClient } from '@/lib/auth-client'

definePageMeta({ layout: false })

const headers = useRequestHeaders(['cookie'])
const { data: existingSession } = await authClient.getSession({ fetchOptions: { headers } })
if (existingSession) {
	await navigateTo('/dashboard')
}

const email = ref('')
const error = ref('')
const loading = ref(false)
const sent = ref(false)

async function sendMagicLink() {
	if (loading.value) return
	loading.value = true
	error.value = ''
	const { error: err } = await authClient.signIn.magicLink({
		email: email.value,
		callbackURL: '/dashboard',
	})
	loading.value = false
	if (err) {
		error.value = err.message ?? 'Failed to send magic link'
		return
	}
	sent.value = true
}

async function oauthLogin(provider: 'github' | 'discord') {
	await authClient.signIn.social({ provider, callbackURL: '/dashboard' })
}
</script>

<template>
	<div class="auth-root">
		<div class="auth-atmosphere" aria-hidden="true" />

		<div class="auth-card">
			<div class="auth-brand">
				<BrandMark :size="30" />
				<span class="brand-name">BX ID</span>
			</div>

			<h1 class="auth-title">Sign in</h1>
			<p class="auth-sub">Access your <strong>Pulsify Dashboard</strong></p>

			<div class="oauth-grid">
				<button class="oauth-btn oauth-btn--gh" @click="oauthLogin('github')">
					<img src="~/assets/external/github.svg" width="17" height="17" alt="" aria-hidden="true" />
					Continue with GitHub
				</button>
				<button class="oauth-btn oauth-btn--dc" @click="oauthLogin('discord')">
					<img src="~/assets/external/discord.svg" width="17" height="17" alt="" aria-hidden="true" />
					Continue with Discord
				</button>
			</div>

			<div class="divider">
				<span>or continue with email</span>
			</div>

			<div v-if="sent" class="sent-state">
				<p class="sent-title">Check your inbox</p>
				<p class="sent-sub">We sent a sign-in link to <strong>{{ email }}</strong></p>
				<button class="resend-btn" @click="sent = false">Use a different email</button>
			</div>

			<form v-else class="auth-form" @submit.prevent="sendMagicLink">
				<div class="field">
					<label for="email">Email</label>
					<input
						id="email"
						v-model="email"
						type="email"
						placeholder="you@example.com"
						autocomplete="email"
						required
						class="auth-input"
					/>
				</div>

				<div v-if="error" class="auth-error">
					{{ error }}
				</div>

				<Button type="submit" class="submit-btn" :disabled="loading">
					<span v-if="!loading">Send magic link</span>
					<span v-else class="spinner" />
				</Button>
			</form>
		</div>
	</div>
</template>

<style scoped>
.auth-root {
	position: relative;
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	overflow: hidden;
}

.auth-atmosphere {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;
	overflow: hidden;
	z-index: 0;
}

.auth-atmosphere::before {
	content: '';
	position: absolute;
	top: -200px;
	left: 50%;
	transform: translateX(-50%);
	width: 1200px;
	height: 800px;
	background: radial-gradient(
		ellipse 50% 45% at 50% 50%,
		color-mix(in oklab, var(--brand-glow) 70%, var(--brand-glow-2)),
		transparent 70%
	);
	filter: blur(50px);
	opacity: 0.55;
}

.auth-atmosphere::after {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		linear-gradient(to right,  rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
	background-size: 56px 56px;
	mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 75%);
	-webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 75%);
}

.auth-card {
	position: relative;
	z-index: 1;
	width: 100%;
	max-width: 400px;
	background: color-mix(in oklab, var(--bg-1) 78%, transparent);
	backdrop-filter: blur(24px) saturate(140%);
	-webkit-backdrop-filter: blur(24px) saturate(140%);
	border: 1px solid color-mix(in oklab, var(--line) 85%, transparent);
	border-radius: 18px;
	padding: 40px 36px;
	box-shadow:
		0 1px 0 rgba(255, 255, 255, 0.045) inset,
		0 40px 100px -20px rgba(0, 0, 0, 0.7),
		0 0 60px -20px var(--brand-soft);
}

.auth-brand {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 28px;
}

.brand-name {
	font: 700 14px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.auth-title {
	font-size: 24px;
	font-weight: 700;
	color: var(--fg-hi);
	letter-spacing: -0.02em;
	margin: 0 0 5px;
}

.auth-sub {
	color: var(--dim);
	font-size: 14px;
	margin: 0 0 26px;
}

.auth-sub strong {
	color: var(--fg);
	font-weight: 500;
}

.oauth-grid {
	display: flex;
	flex-direction: column;
	gap: 9px;
	margin-bottom: 22px;
}

.oauth-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 9px;
	width: 100%;
	height: 41px;
	border-radius: 10px;
	font: 500 13.5px var(--font-sans);
	font-family: inherit;
	cursor: pointer;
	transition: all 0.15s;
	border: 1px solid var(--line-2);
	background: transparent;
	color: var(--fg);
}

.oauth-btn:hover {
	background: var(--bg-2);
	border-color: var(--brand);
	color: var(--fg-hi);
}

.oauth-btn--gh img {
	filter: brightness(0) invert(0.75);
}

.oauth-btn--dc {
	background: oklch(0.44 0.18 265);
	color: #fff;
	border-color: oklch(0.5 0.17 265);
}

.oauth-btn--dc:hover {
	background: oklch(0.48 0.18 265);
	border-color: oklch(0.55 0.17 265);
}

.oauth-btn--dc img {
	filter: brightness(0) invert(1);
}

.divider {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 22px;
	color: var(--mute);
	font-size: 12px;
}

.divider::before,
.divider::after {
	content: "";
	flex: 1;
	height: 1px;
	background: var(--line);
}

.auth-form {
	display: flex;
	flex-direction: column;
	gap: 15px;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.field label {
	font: 500 13px var(--font-sans);
	color: var(--dim);
}

.auth-input {
	width: 100%;
	height: 41px;
	padding: 0 12px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 9px;
	color: var(--fg-hi);
	font: 400 14px var(--font-sans);
	font-family: inherit;
	box-sizing: border-box;
	transition: border-color 0.15s, box-shadow 0.15s;
}

.auth-input::placeholder { color: var(--mute); }

.auth-input:focus {
	outline: none;
	border-color: var(--brand);
	box-shadow: 0 0 0 3px var(--brand-soft);
}

.auth-error {
	padding: 10px 14px;
	background: color-mix(in oklab, var(--err) 12%, transparent);
	border: 1px solid color-mix(in oklab, var(--err) 35%, transparent);
	border-radius: 8px;
	font: 400 13px var(--font-sans);
	color: var(--err);
}

.submit-btn {
	width: 100%;
	height: 41px;
	border-radius: 9px;
	justify-content: center;
}

.submit-btn:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 8px 24px -8px rgba(255, 255, 255, 0.3) !important;
}

.spinner {
	width: 15px;
	height: 15px;
	border: 2px solid rgba(0, 0, 0, 0.18);
	border-top-color: rgba(0, 0, 0, 0.65);
	border-radius: 50%;
	animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.sent-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 24px 16px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 12px;
	text-align: center;
}

.sent-title {
	font: 600 15px var(--font-sans);
	color: var(--fg-hi);
	margin: 0;
}

.sent-sub {
	font: 400 13px var(--font-sans);
	color: var(--dim);
	margin: 0;
	line-height: 1.5;
}

.sent-sub strong { color: var(--fg); font-weight: 500; }

.resend-btn {
	margin-top: 8px;
	background: none;
	border: none;
	font: 400 13px var(--font-sans);
	font-family: inherit;
	color: var(--brand);
	cursor: pointer;
	padding: 0;
	transition: color 0.15s;
}

.resend-btn:hover { color: var(--fg); }

@media (max-width: 480px) {
	.auth-card {
		padding: 32px 24px;
		border-radius: 14px;
	}
}
</style>
