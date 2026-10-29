<script setup lang="ts">
import PixelField from './PixelField.vue';

defineProps<{ lede?: string }>();
</script>

<template>
	<section class="bx-hero" data-nav-overlay>
		<PixelField variant="hero" class="bx-hero__field" />

		<div class="bx-hero__inner">
			<div class="bx-hero__head">
				<span class="bx-hero__bar" aria-hidden="true" />
				<div class="bx-hero__copy">
					<h1 class="bx-hero__title" data-quiet>
						<slot name="title" />
					</h1>
					<p v-if="lede" class="bx-hero__lede" data-quiet>{{ lede }}</p>
				</div>
			</div>
			<div v-if="$slots.cta" class="bx-hero__cta" data-quiet>
				<slot name="cta" />
			</div>
		</div>
	</section>
</template>

<style scoped>
.bx-hero {
	position: relative;
	overflow: hidden;
	margin-top: -56px;
	background:
		radial-gradient(70% 85% at 15% -20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%),
		radial-gradient(60% 75% at 88% -15%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 70%),
		var(--surface-1);
}

.bx-hero .bx-hero__field {
	background: transparent;
}

.bx-hero__inner {
	position: relative;
	box-sizing: border-box;
	max-width: var(--container);
	margin: 0 auto;
	padding: calc(56px + var(--s-32)) var(--s-8) var(--s-32);
}

.bx-hero__head {
	display: flex;
	align-items: stretch;
	gap: var(--s-6);
}

.bx-hero__bar {
	flex: none;
	width: 5px;
	border-radius: var(--r-pill);
	background: linear-gradient(to bottom, var(--accent), var(--accent-2));
}

.bx-hero__copy {
	display: flex;
	flex-direction: column;
	gap: 14px;
	max-width: 48rem;
}

.bx-hero__title {
	margin: 0;
	font: 800 clamp(36px, 5.2vw, 64px) / 1.04 var(--font-sans);
	letter-spacing: -0.035em;
	color: var(--fg-hi);
	text-wrap: balance;
}

.bx-hero__lede {
	margin: 0;
	font: 400 clamp(17px, 1.8vw, 22px) / 1.45 var(--font-sans);
	color: var(--dim);
	text-wrap: pretty;
}

.bx-hero__cta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-3);
	margin: var(--s-8) 0 0 calc(5px + var(--s-6));
}

@media (max-width: 640px) {
	.bx-hero__inner {
		padding: calc(56px + var(--s-16)) var(--s-4) var(--s-16);
	}

	.bx-hero__head {
		gap: var(--s-4);
	}

	.bx-hero__cta {
		flex-direction: column;
		align-items: stretch;
		margin-left: calc(5px + var(--s-4));
	}
}
</style>
