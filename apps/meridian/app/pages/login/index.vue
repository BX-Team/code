<script setup lang="ts">
import { authClient } from '@/lib/auth-client'

definePageMeta({ layout: false })

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
    <div class="hero-bg" aria-hidden="true">
      <div class="grid-overlay" />
    </div>
    <div class="vignette" aria-hidden="true" />

    <div class="auth-card">
      <div class="auth-brand">
        <div class="brand-mark-lg" aria-hidden="true" />
        <span class="brand-name">BX ID</span>
      </div>

      <h1 class="auth-title">Sign in</h1>
      <p class="auth-sub">Access your <strong>Pulsify Dashboard</strong></p>

      <div class="oauth-grid">
        <button class="oauth-btn github" @click="oauthLogin('github')">
          <img src="~/assets/external/github.svg" width="17" height="17" alt="" aria-hidden="true" />
          Continue with GitHub
        </button>
        <button class="oauth-btn discord" @click="oauthLogin('discord')">
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
          />
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="!loading">Send magic link</span>
          <span v-else class="spinner" />
        </button>
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

.auth-card {
  position: relative;
  z-index: 2;
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

/* Brand mark */
.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}

.brand-mark-lg {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: conic-gradient(from 200deg, var(--brand), var(--brand-2), oklch(0.55 var(--accent-c) var(--accent-h)), var(--brand));
  box-shadow: 0 0 16px color-mix(in oklab, var(--brand-soft) 60%, var(--brand-soft-2));
  position: relative;
  flex-shrink: 0;
}
.brand-mark-lg::after {
  content: "";
  position: absolute;
  inset: 6px;
  background: var(--bg-0);
  border-radius: 3px;
}
.brand-mark-lg::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 7px;
  height: 7px;
  background: var(--brand);
  border-radius: 1.5px;
  z-index: 1;
  box-shadow: 0 0 9px var(--brand);
}

.brand-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--fg-hi);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Headings */
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

/* OAuth */
.oauth-grid {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 22px;
}

.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  height: 41px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: opacity 0.15s, transform 0.1s;
  border: 1px solid transparent;
}

.oauth-btn:hover {
  opacity: 0.82;
  transform: translateY(-1px);
}
.oauth-btn:active {
  transform: translateY(0);
}

.oauth-btn img {
  filter: brightness(0) invert(1);
}

.oauth-btn.github {
  background: var(--bg-3);
  color: var(--fg);
  border-color: var(--line-2);
}

.oauth-btn.discord {
  background: oklch(0.44 0.18 265);
  color: #fff;
  border-color: oklch(0.5 0.17 265);
}

/* Divider */
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

/* Form */
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
  font-size: 13px;
  font-weight: 500;
  color: var(--dim);
}

.field input {
  width: 100%;
  height: 41px;
  padding: 0 13px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--fg);
  font-size: 14px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field input::placeholder {
  color: var(--mute);
}

.field input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

.auth-error {
  font-size: 13px;
  color: var(--destructive);
  margin: -2px 0 0;
  padding: 9px 13px;
  background: oklch(0.65 0.21 25 / 0.1);
  border: 1px solid oklch(0.65 0.21 25 / 0.28);
  border-radius: 8px;
  line-height: 1.4;
}

.submit-btn {
  width: 100%;
  height: 41px;
  background: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.submit-btn:hover:not(:disabled) {
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px -8px rgba(255, 255, 255, 0.3);
}

.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(0, 0, 0, 0.18);
  border-top-color: rgba(0, 0, 0, 0.65);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

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
  font-size: 15px;
  font-weight: 600;
  color: var(--fg-hi);
  margin: 0;
}

.sent-sub {
  font-size: 13px;
  color: var(--dim);
  margin: 0;
  line-height: 1.5;
}

.sent-sub strong {
  color: var(--fg);
  font-weight: 500;
}

.resend-btn {
  margin-top: 8px;
  background: none;
  border: none;
  font-size: 13px;
  color: var(--brand);
  cursor: pointer;
  font-family: var(--font-sans);
  padding: 0;
  transition: color 0.15s;
}

.resend-btn:hover {
  color: var(--fg);
}

@media (max-width: 480px) {
  .auth-card {
    padding: 32px 24px;
    border-radius: 14px;
  }
}
</style>
