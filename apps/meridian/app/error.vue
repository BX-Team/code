<script setup lang="ts">
import { Home, ArrowLeft, AlertCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div>
    <div class="hero-bg" aria-hidden="true">
      <div class="grid-overlay" />
    </div>
    <div class="vignette" aria-hidden="true" />

    <AppNavbar />

    <main class="err-main">
      <div class="err-card">
        <div class="err-icon">
          <AlertCircle :size="36" :stroke-width="1.5" />
        </div>
        <div class="err-code">{{ error.statusCode || 500 }}</div>
        <h1>
          {{
            error.statusCode === 404
              ? 'Page not found'
              : error.statusCode === 403
                ? 'Access denied'
                : 'Something went wrong'
          }}
        </h1>
        <p>
          {{
            error.statusMessage
              || (error.statusCode === 404
                ? "The page you're looking for doesn't exist or has been moved."
                : 'An unexpected error occurred. Please try again or head back home.')
          }}
        </p>
        <div class="err-cta">
          <Button variant="default" @click="handleError">
            <Home :size="16" :stroke-width="1.7" /> Back home
          </Button>
          <Button as="a" href="javascript:history.back()" variant="ghost">
            <ArrowLeft :size="16" :stroke-width="1.7" /> Go back
          </Button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.err-main {
  position: relative;
  z-index: 2;
  min-height: 80vh;
  display: grid;
  place-items: center;
  padding: 60px 24px 100px;
}
.err-card {
  max-width: 560px;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 48px 40px;
  background: oklch(0.16 0.006 240 / .6);
  backdrop-filter: blur(12px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, .04) inset,
    0 40px 100px -30px rgba(0, 0, 0, .7),
    0 0 80px -20px var(--brand-soft);
}
.err-icon {
  display: inline-grid; place-items: center;
  width: 64px; height: 64px;
  border-radius: 16px;
  background: var(--brand-soft);
  color: var(--brand);
  margin-bottom: 20px;
}
.err-code {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--brand);
  letter-spacing: .12em;
  margin-bottom: 8px;
}
.err-card h1 {
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  letter-spacing: -.025em;
  color: var(--fg-hi);
  margin: 0 0 14px;
}
.err-card p {
  color: var(--dim);
  font-size: 15.5px;
  line-height: 1.55;
  margin: 0 0 28px;
}
.err-cta { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
</style>
