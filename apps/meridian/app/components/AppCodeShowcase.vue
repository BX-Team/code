<script setup lang="ts">
import { Check } from '@lucide/vue';

const features = [
  'Async flush — never touches the tick loop',
  'Exponential backoff on 5xx',
  'Configurable flush interval',
];

const copied = ref(false);

function copy() {
  navigator.clipboard.writeText(code);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1800);
}

const code = `// Initialize the Pulsify SDK in onEnable()
StatClient client = StatClient.builder()
    .dsn("https://TOKEN@ingest.bxteam.org/v1/proj_a8f3")
    .flushInterval(Duration.ofMinutes(5))
    .build();

// Heartbeats are pushed automatically.
// Custom metrics are explicit:
client.metric("queue.depth", queue.size());
client.error("plugin.load", exception);`;
</script>

<template>
	<section class="cs">
		<div class="cs__inner">
			<div class="cs__text">
				<p class="cs__eyebrow">SDK</p>
				<h2 class="cs__heading">Five lines to send your first event.</h2>
				<p class="cs__lede">
					Initialize <code class="bx-code-inline">StatClient</code> with your DSN,
					batch in memory, flush on a schedule. Hashes IPs client-side.
					Never blocks the main thread.
				</p>
				<ul class="cs__list">
					<li v-for="f in features" :key="f">
						<span class="cs__check">
							<Check :size="12" :stroke-width="2.5" />
						</span>
						{{ f }}
					</li>
				</ul>
			</div>

			<div class="cs__code">
				<div class="cs__code-hd">
					<span class="cs__lang">PulsifyClient.java</span>
					<button class="cs__copy" @click="copy">
						{{ copied ? 'Copied!' : 'Copy' }}
					</button>
				</div>
				<pre class="cs__code-body"><span class="ck-c">// Initialize the Pulsify SDK in onEnable()</span>
<span class="ck-k">StatClient</span> client = <span class="ck-k">StatClient</span>.builder()
    .dsn(<span class="ck-s">"https://TOKEN@ingest.bxteam.org/v1/proj_a8f3"</span>)
    .flushInterval(<span class="ck-k">Duration</span>.ofMinutes(<span class="ck-n">5</span>))
    .build();

<span class="ck-c">// Heartbeats are pushed automatically.</span>
<span class="ck-c">// Custom metrics are explicit:</span>
client.metric(<span class="ck-s">"queue.depth"</span>, queue.size());
client.error(<span class="ck-s">"plugin.load"</span>, exception);</pre>
			</div>
		</div>
	</section>
</template>

<style scoped>
.cs {
	padding: 80px 0;
}

.cs__inner {
	max-width: 1180px;
	margin: 0 auto;
	padding: 0 32px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 60px;
	align-items: center;
}

.cs__eyebrow {
	margin: 0 0 8px;
	font: 600 11px/1.4 var(--font-sans);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.cs__heading {
	margin: 0 0 16px;
	font: 700 30px/1.2 var(--font-heading);
	letter-spacing: -0.015em;
	color: var(--fg-hi);
}

.cs__lede {
	margin: 0 0 22px;
	font: 400 17px/1.55 var(--font-sans);
	color: var(--dim);
	max-width: 52ch;
}

.bx-code-inline {
	font: 500 13.5px var(--font-mono);
	background: var(--bg-3);
	border: 1px solid var(--line);
	color: var(--fg-hi);
	padding: 1px 6px;
	border-radius: var(--r-xs);
}

.cs__list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cs__list li {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 14px;
	color: var(--fg);
}

.cs__check {
	display: inline-grid;
	place-items: center;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: var(--brand-soft);
	color: var(--brand);
	flex-shrink: 0;
}

.cs__code {
	background: oklch(0.10 0.005 240);
	border: 1px solid var(--line);
	border-radius: var(--r-lg);
	overflow: hidden;
	box-shadow: 0 30px 80px -30px color-mix(in oklab, var(--brand-glow) 60%, transparent);
}

.cs__code-hd {
	display: flex;
	align-items: center;
	padding: 8px 14px;
	border-bottom: 1px solid var(--line);
	background: var(--bg-1);
}

.cs__lang {
	font: 500 12px var(--font-mono);
	color: var(--mute);
}

.cs__copy {
	margin-left: auto;
	font: 500 11px var(--font-mono);
	font-family: inherit;
	color: var(--mute);
	background: transparent;
	padding: 3px 10px;
	border: 1px solid var(--line);
	border-radius: var(--r-sm);
	cursor: pointer;
	transition: color 0.15s, border-color 0.15s;
}

.cs__copy:hover {
	color: var(--fg-hi);
	border-color: var(--line-2);
}

.cs__code-body {
	margin: 0;
	padding: 18px 20px;
	font: 400 13px/1.6 var(--font-mono);
	color: var(--fg);
	white-space: pre;
	overflow-x: auto;
}

.ck-c { color: var(--mute); }
.ck-k { color: var(--brand); }
.ck-s { color: var(--brand-2); }
.ck-n { color: oklch(0.78 0.13 320); }

@media (max-width: 768px) {
	.cs {
		padding: 56px 0;
	}

	.cs__inner {
		grid-template-columns: 1fr;
		gap: 32px;
		padding: 0 20px;
	}

	.cs__lede {
		max-width: 100%;
	}
}
</style>
