<script setup lang="ts">
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
        <AppBrandMark :size="30" />
        <span class="brand-name">BX ID</span>
      </div>

      <h1 class="auth-title">Sign in</h1>
      <p class="auth-sub">Access your <strong>Pulsify Dashboard</strong></p>

      <div class="oauth-grid">
        <Button variant="outline" class="oauth-btn github" @click="oauthLogin('github')">
          <img src="~/assets/external/github.svg" width="17" height="17" alt="" aria-hidden="true" />
          Continue with GitHub
        </Button>
        <Button variant="outline" class="oauth-btn discord" @click="oauthLogin('discord')">
          <img src="~/assets/external/discord.svg" width="17" height="17" alt="" aria-hidden="true" />
          Continue with Discord
        </Button>
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
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
            class="auth-input"
          />
        </div>

        <Alert v-if="error" variant="destructive">
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

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
  width: 100%;
  height: 41px;
  border-radius: 10px;
  font-size: 13.5px;
}

.oauth-btn img {
  filter: brightness(0) invert(1);
}

.oauth-btn.github img {
  filter: brightness(0) invert(0.5);
}

.oauth-btn.discord {
  background: oklch(0.44 0.18 265);
  color: #fff;
  border-color: oklch(0.5 0.17 265);
}
.oauth-btn.discord:hover {
  background: oklch(0.48 0.18 265);
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

.auth-input {
  height: 41px;
  background: var(--bg-2);
  border-color: var(--line);
  border-radius: 9px;
  color: var(--fg);
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  height: 41px;
  border-radius: 9px;
  margin-top: 2px;
}

.submit-btn:hover:not(:disabled) {
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px -8px rgba(255, 255, 255, 0.3);
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
