<script setup lang="ts">
import type { Decorations } from '@/lib/colortext';
import { DIRT, LANDSCAPE, type PreviewMode, textShadow } from '@/lib/mcscene';

const props = defineProps<{
  glyphs: { char: string; shown: string }[];
  decorations: Decorations;
  mode: PreviewMode;
}>();

const style = computed(() => ({
  fontWeight: props.decorations.bold ? 700 : 400,
  fontStyle: props.decorations.italic ? 'italic' : 'normal',
  textDecorationLine:
    [props.decorations.underlined && 'underline', props.decorations.strikethrough && 'line-through']
      .filter(Boolean)
      .join(' ') || 'none',
}));

/** Text the game draws itself, in one colour with its shadow. */
const plain = (hex: string) => ({ color: hex, textShadow: textShadow(hex) });
const { t } = useI18n();

// A grass block, 8×8, for the server icon in the list.
const ICON = ['gggggggg', 'gGggGggg', 'dgdddgdg', 'dddDdddd', 'dDdddddD', 'ddddDddd', 'dddddddd', 'dDdddDdd'];
const ICON_FILL: Record<string, string> = { g: '#5d9a3c', G: '#7cbd4f', d: '#6b4a2f', D: '#4f3622' };
</script>

<template>
	<div class="mc" :class="`mc--${mode}`" :style="{ '--dirt': DIRT, '--land': LANDSCAPE }">
		<template v-if="mode === 'chat'">
			<div class="mc__chat">
				<p><span :style="plain('#ffffff')">&lt;Alex&gt; {{ t('tools.mc.chat1') }}</span></p>
				<p><span :style="plain('#ffffff')">&lt;Steve&gt; {{ t('tools.mc.chat2') }}</span></p>
				<p>
					<span :style="plain('#ffffff')">&lt;Steve&gt; </span><span :style="style"><span
						v-for="(g, i) in glyphs"
						:key="i"
						:style="plain(g.shown)"
					>{{ g.char }}</span></span>
				</p>
			</div>
		</template>

		<template v-else-if="mode === 'title'">
			<div class="mc__title">
				<p class="mc__big" :style="style">
					<span v-for="(g, i) in glyphs" :key="i" :style="{ color: g.shown, textShadow: textShadow(g.shown, 4) }">{{ g.char }}</span>
				</p>
				<p class="mc__sub" :style="plain('#aaaaaa')">{{ t('tools.mc.welcome') }}</p>
			</div>
		</template>

		<template v-else-if="mode === 'motd'">
			<div class="mc__list">
				<div class="mc__server">
					<svg class="mc__icon" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">
						<template v-for="(row, y) in ICON" :key="y">
							<rect v-for="(c, x) in row" :key="x" :x="x" :y="y" width="1" height="1" :fill="ICON_FILL[c]" />
						</template>
					</svg>
					<div class="mc__entry">
						<div class="mc__entry-top">
							<span :style="plain('#ffffff')">{{ t('tools.mc.server') }}</span>
							<span class="mc__players" :style="plain('#aaaaaa')">12/100</span>
						</div>
						<p class="mc__motd" :style="style">
							<span v-for="(g, i) in glyphs" :key="i" :style="plain(g.shown)">{{ g.char }}</span>
						</p>
					</div>
				</div>
			</div>
		</template>

		<template v-else-if="mode === 'item'">
			<div class="mc__tooltip">
				<p :style="style">
					<span v-for="(g, i) in glyphs" :key="i" :style="plain(g.shown)">{{ g.char }}</span>
				</p>
				<p class="mc__gap" />
				<p :style="plain('#aaaaaa')">{{ t('tools.mc.mainHand') }}</p>
				<p :style="plain('#00aa00')">&nbsp;{{ t('tools.mc.damage') }}</p>
				<p :style="plain('#00aa00')">&nbsp;{{ t('tools.mc.speed') }}</p>
			</div>
		</template>

		<template v-else-if="mode === 'nametag'">
			<div class="mc__tag" :style="style">
				<span v-for="(g, i) in glyphs" :key="i" :style="{ color: g.shown }">{{ g.char }}</span>
			</div>
		</template>

		<template v-else>
			<div class="mc__kick">
				<p :style="plain('#aaaaaa')">{{ t('tools.mc.lost') }}</p>
				<p class="mc__reason" :style="style">
					<span v-for="(g, i) in glyphs" :key="i" :style="plain(g.shown)">{{ g.char }}</span>
				</p>
				<span class="mc__button" :style="plain('#ffffff')">{{ t('tools.mc.back') }}</span>
			</div>
		</template>
	</div>
</template>

<style scoped>
@font-face {
	font-family: "Monocraft";
	src: url("/fonts/monocraft/Monocraft-Regular.woff2") format("woff2");
	font-weight: 400;
	font-style: normal;
	font-display: swap;
}

@font-face {
	font-family: "Monocraft";
	src: url("/fonts/monocraft/Monocraft-Bold.woff2") format("woff2");
	font-weight: 700;
	font-style: normal;
	font-display: swap;
}

@font-face {
	font-family: "Monocraft";
	src: url("/fonts/monocraft/Monocraft-Italic.woff2") format("woff2");
	font-weight: 400;
	font-style: italic;
	font-display: swap;
}

@font-face {
	font-family: "Monocraft";
	src: url("/fonts/monocraft/Monocraft-BoldItalic.woff2") format("woff2");
	font-weight: 700;
	font-style: italic;
	font-display: swap;
}

.mc {
	position: relative;
	display: flex;
	height: 300px;
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--land) center bottom / cover;
	image-rendering: pixelated;
	font: 400 16px/1.25 "Monocraft", ui-monospace, monospace;
	color: #fff;
}

.mc p {
	margin: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.mc--motd,
.mc--kick {
	background: linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), var(--dirt) 0 0 / 64px 64px;
}

.mc__chat {
	align-self: flex-end;
	display: flex;
	flex-direction: column;
	gap: 0;
	width: min(100%, 520px);
	margin: 0 0 44px 8px;
}

.mc__chat p {
	padding: 2px 6px;
	background: rgba(0, 0, 0, 0.5);
}

.mc__title {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 14px;
	width: 100%;
	padding: 16px;
	text-align: center;
}

.mc__big {
	font-size: clamp(28px, 5vw, 44px);
	line-height: 1.1;
}

.mc__sub {
	font-size: 18px;
}

.mc__list {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: 16px;
}

.mc__server {
	display: flex;
	gap: 8px;
	width: min(100%, 560px);
	padding: 6px;
	border: 2px solid #808080;
	background: rgba(0, 0, 0, 0.55);
}

.mc__icon {
	flex: none;
	width: 64px;
	height: 64px;
}

.mc__entry {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.mc__entry-top {
	display: flex;
	justify-content: space-between;
	gap: 8px;
}

.mc__motd {
	min-height: 2.5em;
	color: #aaaaaa;
}

.mc__tooltip {
	align-self: center;
	margin: 0 auto;
	padding: 6px 8px;
	max-width: min(90%, 460px);
	border: 2px solid #25015b;
	border-radius: 3px;
	outline: 2px solid #100010;
	background: rgba(16, 0, 16, 0.94);
}

.mc__gap {
	height: 0.5em;
}

.mc__tag {
	align-self: center;
	margin: 0 auto 40px;
	padding: 2px 6px;
	background: rgba(0, 0, 0, 0.25);
	font-size: 22px;
}

.mc__kick {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 18px;
	width: 100%;
	padding: 16px;
	text-align: center;
}

.mc__reason {
	max-width: 520px;
}

.mc__button {
	padding: 6px 24px;
	border: 2px solid #000;
	background: #6f6f6f;
	box-shadow: inset 2px 2px 0 #9a9a9a, inset -2px -2px 0 #4a4a4a;
}

@media (max-width: 520px) {
	.mc {
		height: 240px;
		font-size: 13px;
	}

	.mc__icon {
		width: 44px;
		height: 44px;
	}
}
</style>
