<script setup lang="ts">
import { Button } from '@bx-team/ui';
import { AlertCircle, ArrowLeft, Home } from '@lucide/vue';

defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string };
}>();

const { t } = useI18n();
const sitePath = useSitePath();
const handleError = () => clearError({ redirect: sitePath('/') });
</script>

<template>
	<div class="err-page">

		<SiteNav />

		<main class="err-main">
			<div class="err-card">
				<div class="err-icon">
					<AlertCircle :size="36" :stroke-width="1.5" />
				</div>
				<div class="err-code">{{ error.statusCode || 500 }}</div>
				<h1>
					{{
						error.statusCode === 404
							? t('error.notFound')
							: error.statusCode === 403
								? t('error.denied')
								: t('error.failed')
					}}
				</h1>
				<p>
					{{
						(error.statusCode === 404 ? t('error.notFoundBody') : error.statusMessage || t('error.failedBody'))
					}}
				</p>
				<div class="err-cta">
					<Button variant="primary" @click="handleError">
						<Home :size="16" :stroke-width="1.7" />
						{{ t('error.home') }}
					</Button>
					<Button variant="ghost" href="javascript:history.back()">
						<ArrowLeft :size="16" :stroke-width="1.7" />
						{{ t('error.back') }}
					</Button>
				</div>
			</div>
		</main>
	</div>
</template>

<style scoped>
.err-page {
	position: relative;
	min-height: 100vh;
	/* `clip`, not `hidden`: `hidden` would make this a scroll container and unstick the bar. */
	overflow-x: clip;
}

.err-main {
	position: relative;
	z-index: 1;
	min-height: 80vh;
	display: grid;
	place-items: center;
	padding: 60px 24px 100px;
}

.err-card {
	max-width: 560px;
	text-align: center;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	padding: 48px 40px;
	background: var(--bg-1);
	box-shadow: var(--shadow-pop);
}

.err-icon {
	display: inline-grid;
	place-items: center;
	width: 64px;
	height: 64px;
	border-radius: var(--r-2);
	background: var(--brand-soft);
	color: var(--brand);
	margin-bottom: 20px;
}

.err-code {
	font: 600 14px var(--font-mono);
	color: var(--brand);
	letter-spacing: 0.12em;
	margin-bottom: 8px;
}

.err-card h1 {
	font-size: clamp(28px, 4vw, 40px);
	font-weight: 700;
	letter-spacing: -0.025em;
	color: var(--fg-hi);
	margin: 0 0 14px;
}

.err-card p {
	color: var(--dim);
	font-size: 15.5px;
	line-height: 1.55;
	margin: 0 0 28px;
}

.err-cta {
	display: flex;
	gap: 10px;
	justify-content: center;
	flex-wrap: wrap;
}
</style>
