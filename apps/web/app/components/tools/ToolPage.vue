<script setup lang="ts">
/** The frame of every tool: crumbs, a title and its line, then the tool itself. */
withDefaults(defineProps<{ title: string; lead: string; crumb?: boolean }>(), { crumb: true });
</script>

<template>
	<PageShell>
		<main class="tool">
			<header class="tool__head">
				<nav v-if="crumb" class="tool__crumbs" aria-label="Breadcrumb">
					<NuxtLink to="/tools">Tools</NuxtLink>
					<span aria-hidden="true">/</span>
					<span aria-current="page">{{ title }}</span>
				</nav>
				<div class="tool__row">
					<div class="tool__text">
						<h1 class="tool__title">{{ title }}</h1>
						<p class="tool__lead">{{ lead }}</p>
					</div>
					<div v-if="$slots.aside" class="tool__aside">
						<slot name="aside" />
					</div>
				</div>
			</header>

			<div class="tool__body">
				<slot />
			</div>
		</main>
	</PageShell>
</template>

<style scoped>
.tool__head {
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
	max-width: var(--container);
	box-sizing: border-box;
	margin: 0 auto;
	padding: var(--s-10) var(--s-4) var(--s-6);
}

.tool__crumbs {
	display: flex;
	gap: var(--s-2);
	font: 400 13px/1.4 var(--font-sans);
	color: var(--mute);
}

.tool__crumbs a {
	color: var(--dim);
	transition: color 0.15s ease;
}

.tool__crumbs a:hover {
	color: var(--accent);
}

.tool__crumbs [aria-current] {
	color: var(--fg);
}

.tool__row {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--s-4) var(--s-8);
}

.tool__text {
	display: flex;
	flex-direction: column;
	gap: var(--s-2);
	max-width: 46rem;
}

.tool__title {
	margin: 0;
	font: 900 clamp(30px, 4.2vw, 44px) / 1.05 var(--font-sans);
	letter-spacing: -0.045em;
	color: var(--fg-hi);
}

.tool__lead {
	margin: 0;
	font: 400 15px/1.6 var(--font-sans);
	color: var(--dim);
}

.tool__body {
	max-width: var(--container);
	box-sizing: border-box;
	margin: 0 auto;
	padding: 0 var(--s-4);
}
</style>

<style>
/* The controls every tool is built from. Unscoped, because they live in each page's slot. */
.tool .panel {
	padding: var(--s-5);
	border: 1px solid var(--line);
	border-radius: var(--r-4);
	background: var(--surface-card);
}

.tool .label {
	display: block;
	font: 500 11px/1.4 var(--font-mono);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.tool .field {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.tool .input {
	box-sizing: border-box;
	width: 100%;
	min-height: 44px;
	padding: 0 12px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: var(--surface-1);
	color: var(--fg-hi);
	font: 500 14px/1 var(--font-mono);
	transition: border-color 0.15s ease;
}

.tool textarea.input {
	min-height: 96px;
	padding: 12px;
	line-height: 1.55;
	resize: vertical;
}

.tool .input:focus {
	outline: none;
	border-color: var(--accent);
}

.tool .input:disabled {
	color: var(--mute);
	cursor: not-allowed;
}

.tool .input.bad {
	border-color: var(--err);
}

.tool .hint {
	margin: 0;
	font: 400 12.5px/1.5 var(--font-sans);
	color: var(--mute);
}

.tool .hint.bad {
	color: var(--warn);
}

.tool .btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 44px;
	padding: 0 18px;
	border: 1px solid var(--line-2);
	border-radius: var(--r-2);
	background: var(--surface-3);
	color: var(--fg-hi);
	font: 500 13.5px/1 var(--font-sans);
	cursor: pointer;
	transition: background-color 0.15s ease, border-color 0.15s ease;
}

.tool .btn:hover:not(:disabled) {
	background: var(--surface-2);
	border-color: var(--rule);
}

.tool .btn.primary {
	border-color: var(--fg-hi);
	background: var(--fg-hi);
	color: var(--surface-deep);
}

.tool .btn.primary:hover:not(:disabled) {
	background: var(--fg);
}

.tool .btn:disabled {
	color: var(--mute);
	border-color: var(--line);
	background: transparent;
	cursor: not-allowed;
}

.tool .chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.tool .chip {
	min-height: 32px;
	padding: 0 11px;
	border: 1px solid var(--line);
	border-radius: var(--r-pill);
	background: transparent;
	color: var(--mute);
	font: 500 12px/1 var(--font-mono);
	cursor: pointer;
	transition: border-color 0.15s ease, color 0.15s ease;
}

.tool .chip:hover {
	color: var(--fg-hi);
	border-color: var(--line-2);
}

.tool .chip.on {
	background: var(--surface-3);
	color: var(--fg-hi);
	border-color: var(--rule);
}

.tool .check {
	display: inline-flex;
	gap: 8px;
	align-items: center;
	min-height: 36px;
	font: 400 13px/1.4 var(--font-sans);
	color: var(--dim);
	cursor: pointer;
}

.tool .check input[type="checkbox"] {
	width: 16px;
	height: 16px;
	accent-color: var(--accent);
}

.tool .check code {
	font: 500 12px/1 var(--font-mono);
	color: var(--fg);
}

.tool .section {
	margin-top: var(--s-12);
}

.tool .section > h2 {
	margin: 0 0 6px;
	font: 700 20px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.tool .section > .section-lead {
	margin: 0 0 var(--s-4);
	max-width: 68ch;
	font: 400 14px/1.6 var(--font-sans);
	color: var(--dim);
}

.tool .explain {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 12px;
}

.tool .explain article {
	padding: 16px 18px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-card);
}

.tool .explain h3 {
	margin: 0 0 6px;
	font: 600 14px/1.4 var(--font-sans);
	color: var(--fg-hi);
}

.tool .explain p {
	margin: 0;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--dim);
}

.tool .explain code {
	font: 500 12.5px/1 var(--font-mono);
	color: var(--fg);
	overflow-wrap: anywhere;
}

@media (max-width: 640px) {
	.tool .panel {
		padding: var(--s-4);
	}
}
</style>
