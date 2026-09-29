<script setup lang="ts">
import { ref } from 'vue';
import { MARK, type PixelGlyph, WORDMARK } from '../pixel/glyphs';
import PixelField from './PixelField.vue';

defineProps<{ lede?: string }>();

const slotEl = ref<HTMLElement | null>(null);
const markEl = ref<HTMLElement | null>(null);
const painted = ref(false);

function runsOf(glyph: PixelGlyph) {
  return glyph.rows.flatMap((bits, y) => {
    const out: { x: number; y: number; w: number }[] = [];
    let start = -1;
    for (let x = 0; x <= bits.length; x++) {
      if (bits[x] === '1') {
        if (start < 0) start = x;
      } else if (start >= 0) {
        out.push({ x: start, y, w: x - start });
        start = -1;
      }
    }
    return out;
  });
}

const wordRuns = runsOf(WORDMARK);
const markRuns = runsOf(MARK);
</script>

<template>
	<section class="bx-hero" data-nav-overlay>
		<PixelField variant="hero" :slot-el="slotEl" :mark-el="markEl" @painted="painted = true" />

		<div class="bx-hero__inner">
			<div class="bx-hero__main">
				<div
					ref="slotEl"
					class="bx-hero__wordmark"
					:class="{ 'bx-hero__glyph--painted': painted }"
					role="img"
					aria-label="BX Team"
				>
					<svg
						:viewBox="`0 0 ${WORDMARK.width} ${WORDMARK.height}`"
						preserveAspectRatio="none"
						shape-rendering="crispEdges"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id="bx-hero-ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="WORDMARK.width" y2="0">
								<stop offset="0" style="stop-color: var(--accent)" />
								<stop offset="1" style="stop-color: var(--accent-2)" />
							</linearGradient>
						</defs>
						<rect v-for="r in wordRuns" :key="`${r.x}-${r.y}`" :x="r.x" :y="r.y" :width="r.w" height="1" fill="url(#bx-hero-ink)" />
					</svg>
				</div>

				<div class="bx-hero__copy">
					<h1 class="bx-hero__title" data-quiet>
						<span class="bx-hero__sr">BX Team: </span>
						<slot name="title" />
					</h1>
					<p v-if="lede" class="bx-hero__lede" data-quiet>{{ lede }}</p>
					<div v-if="$slots.cta" class="bx-hero__cta" data-quiet>
						<slot name="cta" />
					</div>
				</div>
			</div>

			<div ref="markEl" class="bx-hero__mark" :class="{ 'bx-hero__glyph--painted': painted }" aria-hidden="true">
				<svg
					:viewBox="`0 0 ${MARK.width} ${MARK.height}`"
					preserveAspectRatio="none"
					shape-rendering="crispEdges"
				>
					<defs>
						<linearGradient id="bx-hero-mark-ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="MARK.width" y2="0">
							<stop offset="0" style="stop-color: var(--accent)" />
							<stop offset="1" style="stop-color: var(--accent-2)" />
						</linearGradient>
					</defs>
					<rect v-for="r in markRuns" :key="`${r.x}-${r.y}`" :x="r.x" :y="r.y" :width="r.w" height="1" fill="url(#bx-hero-mark-ink)" />
				</svg>
			</div>
		</div>
	</section>
</template>

<style scoped>
.bx-hero {
	position: relative;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	margin-top: -56px;
	min-height: 100svh;
	background: var(--pixel-bg);
	border-bottom: 1px solid var(--line);
	user-select: none;
	-webkit-touch-callout: none;
}

.bx-hero__inner {
	position: relative;
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--s-16);
	box-sizing: border-box;
	width: 100%;
	max-width: var(--container);
	margin: 0 auto;
	padding: calc(56px + var(--s-12)) var(--s-8) var(--s-16);
	pointer-events: none;
}

.bx-hero__main {
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.bx-hero__wordmark {
	width: 100%;
	max-width: 640px;
	aspect-ratio: 65 / 12;
}

.bx-hero__mark {
	flex: none;
	width: clamp(180px, 16vw, 220px);
	aspect-ratio: 1;
}

.bx-hero__wordmark svg,
.bx-hero__mark svg {
	display: block;
	width: 100%;
	height: 100%;
}

.bx-hero__glyph--painted {
	visibility: hidden;
}

.bx-hero__copy {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;
	max-width: 36rem;
	margin-top: var(--s-12);
	pointer-events: auto;
	user-select: text;
}

.bx-hero__title {
	margin: 0;
	font: 500 26px/1.35 var(--font-mono);
	letter-spacing: -0.01em;
	color: var(--fg);
	text-wrap: balance;
}

.bx-hero__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.bx-hero__lede {
	margin: var(--s-4) 0 0;
	font: 400 15px/1.6 var(--font-mono);
	color: var(--dim);
	text-wrap: pretty;
}

.bx-hero__cta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--s-3);
	margin-top: var(--s-8);
}

@media (max-width: 860px) {
	.bx-hero__mark {
		display: none;
	}

	.bx-hero__main,
	.bx-hero__copy {
		align-items: center;
		text-align: center;
	}

	.bx-hero__copy {
		margin-inline: auto;
	}

	.bx-hero__cta {
		justify-content: center;
	}
}

@media (max-width: 640px) {
	.bx-hero__inner {
		padding: calc(56px + var(--s-10)) var(--s-4) var(--s-12);
	}

	.bx-hero__copy {
		margin-top: var(--s-10);
	}

	.bx-hero__title {
		font-size: 21px;
	}

	.bx-hero__cta {
		flex-direction: column;
		align-items: stretch;
		width: 100%;
		max-width: 20rem;
	}
}
</style>
