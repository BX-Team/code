<script setup lang="ts">
import { Activity, AlertCircle, Box, Database, Search, Users, Zap } from '@lucide/vue';
import { onMounted, onUnmounted, ref } from 'vue';

type Tab = 'docs' | 'dashboard' | 'errors';

const TAB_ORDER: Tab[] = ['docs', 'dashboard', 'errors'];
const TAB_MS = 4500;

const activeTab = ref<Tab>('dashboard');
const paused = ref(false);

let timer: ReturnType<typeof setInterval>;

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!paused.value) {
      const idx = TAB_ORDER.indexOf(activeTab.value);
      activeTab.value = TAB_ORDER[(idx + 1) % TAB_ORDER.length] ?? 'docs';
    }
  }, TAB_MS);
}

function selectTab(id: Tab) {
  activeTab.value = id;
  startTimer();
}

onMounted(startTimer);
onUnmounted(() => clearInterval(timer));

const tabs: { id: Tab; label: string }[] = [
  { id: 'docs', label: 'Docs' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'errors', label: 'Errors' },
];

const docsSideActive = ref('installation');
const dashSideActive = ref('creative-hub');
const dashSegment = ref<'24h' | '7d' | '30d'>('24h');

const previewUrls: Record<Tab, string> = {
  docs: 'bxteam.org/docs/divinemc/getting-started/installation',
  dashboard: 'bxteam.org/dashboard/creative-hub',
  errors: 'bxteam.org/dashboard/creative-hub/errors',
};

/* ── Chart ── */
const chartData = [
  12, 18, 22, 19, 28, 35, 42, 48, 55, 60, 66, 70, 78, 85, 92, 98, 110, 124, 138, 142, 138, 130, 124, 118,
];
const W = 600,
  H = 140,
  MAX = 150;

const { chartLine, chartArea } = (() => {
  const pts = chartData.map((p, i) => [((i / (chartData.length - 1)) * W).toFixed(1), (H - (p / MAX) * H).toFixed(1)]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  return { chartLine: line, chartArea: `${line} L ${W} ${H} L 0 ${H} Z` };
})();
</script>

<template>
	<div class="pv-wrap">
		<!-- Tab selector -->
		<div class="pv-tabs" @mouseenter="paused = true" @mouseleave="paused = false">
			<button
				v-for="tab in tabs"
				:key="tab.id"
				class="pv-tab"
				:class="{ 'pv-tab--active': activeTab === tab.id }"
				@click="selectTab(tab.id)"
			>
				{{ tab.label }}
				<span v-if="activeTab === tab.id" :key="activeTab" class="pv-tab-prog" :style="`--dur:${TAB_MS}ms`" />
			</button>
		</div>

		<!-- Preview window -->
		<div class="pv-window">
			<!-- Window chrome -->
			<div class="pv-hd">
				<div class="pv-hd__dots">
					<i /><i /><i />
				</div>
				<div class="pv-hd__url">
					<Search :size="12" :stroke-width="1.6" />
					<span>{{ previewUrls[activeTab] }}</span>
					<span class="pv-esc">ESC</span>
				</div>
			</div>

			<!-- Window body -->
			<Transition name="tab" mode="out-in">
			<div :key="activeTab" class="pv-body">
				<!-- ── Docs tab ── -->
				<template v-if="activeTab === 'docs'">
					<aside class="pv-side">
						<div class="pv-proj-btn">
							<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>
							<span>DivineMC</span>
						</div>
						<h5>Overview</h5>
						<ul>
							<li :class="{ active: docsSideActive === 'overview' }" @click="docsSideActive = 'overview'">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>Introduction
							</li>
						</ul>
						<h5>Getting Started</h5>
						<ul>
							<li :class="{ active: docsSideActive === 'installation' }" @click="docsSideActive = 'installation'">
								<span class="ic"><Zap :size="13" :stroke-width="1.6" /></span>Installation
							</li>
							<li :class="{ active: docsSideActive === 'plugins' }" @click="docsSideActive = 'plugins'">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>Plugins
							</li>
						</ul>
						<h5>Features</h5>
						<ul>
							<li :class="{ active: docsSideActive === 'parallel' }" @click="docsSideActive = 'parallel'">
								<span class="ic"><Activity :size="13" :stroke-width="1.6" /></span>Parallel Ticking
							</li>
							<li :class="{ active: docsSideActive === 'chunks' }" @click="docsSideActive = 'chunks'">
								<span class="ic"><Database :size="13" :stroke-width="1.6" /></span>Chunk Ticking
							</li>
						</ul>
						<h5>Reference</h5>
						<ul>
							<li :class="{ active: docsSideActive === 'config' }" @click="docsSideActive = 'config'">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>Configuration
							</li>
							<li :class="{ active: docsSideActive === 'props' }" @click="docsSideActive = 'props'">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>System Properties
							</li>
						</ul>
					</aside>

					<main class="pv-main pv-doc">
						<div class="doc-breadcrumb">DivineMC › Getting Started</div>
						<h2 class="doc-title">Installation</h2>
						<p class="doc-lede">Download the latest DivineMC jar and drop it into your server directory.</p>

						<div class="doc-steps">
							<div class="doc-step">
								<div class="step-num">1</div>
								<div class="step-body">
									<div class="step-title">Download the JAR</div>
									<div class="step-desc">Go to Downloads and grab the latest build for your Minecraft version.</div>
								</div>
							</div>
							<div class="doc-step">
								<div class="step-num">2</div>
								<div class="step-body">
									<div class="step-title">Replace your server jar</div>
									<div class="step-desc">Rename the downloaded file to <code>server.jar</code> and place it in your root directory.</div>
								</div>
							</div>
							<div class="doc-step">
								<div class="step-num doc-step-active">3</div>
								<div class="step-body">
									<div class="step-title">Start the server</div>
									<div class="step-desc">Run your start script. DivineMC is a drop-in replacement — no extra configuration required.</div>
								</div>
							</div>
						</div>
					</main>

					<aside class="pv-side-r">
						<h5>On this page</h5>
						<ul>
							<li class="active">Installation</li>
							<li>Prerequisites</li>
							<li>Download</li>
							<li>Configuration</li>
						</ul>
						<div class="toc-foot-mini">
							<span>Edit on GitHub</span>
							<span>Report an issue</span>
						</div>
					</aside>
				</template>

				<!-- ── Dashboard tab ── -->
				<template v-else-if="activeTab === 'dashboard'">
					<aside class="pv-side">
						<h5>Workspace</h5>
						<ul>
							<li class="active">
								<span class="ic"><Activity :size="13" :stroke-width="1.6" /></span>Overview
							</li>
							<li>
								<span class="ic"><Users :size="13" :stroke-width="1.6" /></span>Players
							</li>
							<li>
								<span class="ic"><AlertCircle :size="13" :stroke-width="1.6" /></span>Errors
								<span class="badge-num">3</span>
							</li>
							<li>
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>Plugins
							</li>
							<li>
								<span class="ic"><Database :size="13" :stroke-width="1.6" /></span>Tokens
							</li>
						</ul>
						<h5>Projects</h5>
						<ul>
							<li :class="{ active: dashSideActive === 'survival' }" @click="dashSideActive = 'survival'">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>survival-main
							</li>
							<li :class="{ active: dashSideActive === 'creative-hub' }" @click="dashSideActive = 'creative-hub'">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>creative-hub
							</li>
							<li :class="{ active: dashSideActive === 'ndaily' }" @click="dashSideActive = 'ndaily'">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>NDailyRewards
							</li>
						</ul>
					</aside>

					<main class="pv-main pv-dash">
						<div class="dash-hd">
							<div>
								<div class="eyebrow" style="margin-bottom: 4px; font: 600 10.5px var(--font-sans); text-transform: uppercase; letter-spacing: .08em; color: var(--mute);">
									Server · Paper 1.21.1
								</div>
								<div class="dash-title">creative-hub</div>
							</div>
							<div class="dash-live">
								<span class="b-mono">TPS 19.8</span>
								<span class="b-mono">MSPT 12ms</span>
								<span class="chip-status"><span class="chip-dot" />live</span>
							</div>
						</div>

						<div class="dash-stats">
							<div class="stat">
								<div class="stat-row">
									<div class="stat-l">Online now</div>
									<span class="stat-trend up">↗ +12</span>
								</div>
								<div class="stat-v">142</div>
								<div class="stat-cap">players connected</div>
							</div>
							<div class="stat">
								<div class="stat-row">
									<div class="stat-l">Peak today</div>
									<span class="stat-trend up">↗ +4%</span>
								</div>
								<div class="stat-v">218</div>
								<div class="stat-cap">highest concurrent</div>
							</div>
							<div class="stat">
								<div class="stat-row">
									<div class="stat-l">Errors (24h)</div>
									<span class="stat-trend down">↘ −2</span>
								</div>
								<div class="stat-v">3</div>
								<div class="stat-cap">across all nodes</div>
							</div>
							<div class="stat">
								<div class="stat-row">
									<div class="stat-l">Sessions</div>
									<span class="stat-trend up">↗ +96</span>
								</div>
								<div class="stat-v">1,284</div>
								<div class="stat-cap">last 24 hours</div>
							</div>
						</div>

						<div class="dash-card">
							<div class="dash-card-hd">
								<span class="dash-card-title">Online players · last 24h</span>
								<div class="dash-segs">
									<span
										v-for="s in ['24h', '7d', '30d']"
										:key="s"
										class="seg"
										:class="{ 'seg--active': dashSegment === s }"
										@click="dashSegment = (s as '24h' | '7d' | '30d')"
									>{{ s }}</span>
								</div>
							</div>

							<svg :viewBox="`0 0 ${W} ${H + 20}`" style="width: 100%; height: 120px; display: block; margin-top: 8px;">
								<defs>
									<linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
										<stop offset="0%" stop-color="var(--brand)" stop-opacity=".3" />
										<stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
									</linearGradient>
								</defs>
								<line v-for="t in [0, 0.25, 0.5, 0.75, 1]" :key="t" x1="0" :x2="W" :y1="t * H" :y2="t * H" stroke="var(--line)" stroke-width=".5" stroke-dasharray="2 4" />
								<path :d="chartArea" fill="url(#chart-grad)" />
								<path :d="chartLine" stroke="var(--brand)" stroke-width="2" fill="none" />
							</svg>
						</div>
					</main>

					<aside class="pv-side-r">
						<h5>Recent errors</h5>
						<ul class="err-list">
							<li>
								<span class="lvl lvl--err">ERR</span>
								NullPointerException at WorldGenRegion.getBlock
							</li>
							<li>
								<span class="lvl lvl--warn">WARN</span>
								Plugin load took 1840ms
							</li>
							<li>
								<span class="lvl lvl--err">ERR</span>
								ConcurrentModificationException · NDailyRewards
							</li>
						</ul>
					</aside>
				</template>

				<!-- ── Errors tab ── -->
				<template v-else>
					<aside class="pv-side">
						<div class="pv-proj-btn">
							<span class="ic"><Activity :size="13" :stroke-width="1.6" /></span>
							<span>Pulsify</span>
						</div>
						<h5>Navigation</h5>
						<ul>
							<li>
								<span class="ic"><Activity :size="13" :stroke-width="1.6" /></span>Overview
							</li>
							<li>
								<span class="ic"><Users :size="13" :stroke-width="1.6" /></span>Players
							</li>
							<li class="active">
								<span class="ic"><AlertCircle :size="13" :stroke-width="1.6" /></span>Issues
								<span class="badge-num">3</span>
							</li>
						</ul>
						<h5>Projects</h5>
						<ul>
							<li>
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>survival-main
							</li>
							<li class="active">
								<span class="ic"><Box :size="13" :stroke-width="1.6" /></span>creative-hub
							</li>
						</ul>
					</aside>

					<main class="pv-main">
						<div class="err-card">
							<div class="err-card-hd">
								<div>
									<div class="err-card-title">Issues</div>
									<div class="err-card-sub">3 total · across all nodes</div>
								</div>
								<div class="dash-live">
									<span class="lvl lvl--err" style="padding: 3px 8px;">2 ERR</span>
									<span class="lvl lvl--warn" style="padding: 3px 8px;">1 WARN</span>
								</div>
							</div>

							<div class="err-table">
								<div class="err-table-row err-table-row--header">
									<span>Level</span>
									<span>Message</span>
									<span>Count</span>
									<span>Last seen</span>
								</div>
								<div class="err-table-row err-table-row--err">
									<span><span class="lvl lvl--err">ERR</span></span>
									<span>NullPointerException at WorldGenRegion.getBlock</span>
									<span>47</span>
									<span class="err-time">2h ago</span>
								</div>
								<div class="err-table-row err-table-row--warn">
									<span><span class="lvl lvl--warn">WARN</span></span>
									<span>Plugin load took 1840ms · NDailyRewards</span>
									<span>12</span>
									<span class="err-time">4h ago</span>
								</div>
								<div class="err-table-row err-table-row--err">
									<span><span class="lvl lvl--err">ERR</span></span>
									<span>ConcurrentModificationException · NDailyRewards</span>
									<span>3</span>
									<span class="err-time">1d ago</span>
								</div>
							</div>
						</div>
					</main>

					<aside class="pv-side-r">
						<h5>Top issue</h5>
						<div style="font: 500 11px var(--font-mono); color: var(--err); margin-bottom: 8px;">NullPointerException</div>
						<div style="font: 400 11px/1.5 var(--font-mono); color: var(--dim); word-break: break-word;">
							at WorldGenRegion.getBlock(WorldGenRegion.java:158)<br>
							at ChunkGenerator.fill(ChunkGenerator.java:47)<br>
							at ServerLevel.tick(ServerLevel.java:712)
						</div>
						<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line);">
							<div class="stat-l" style="margin-bottom: 6px;">Occurrences</div>
							<div style="font: 600 22px var(--font-sans); color: var(--fg-hi); letter-spacing: -0.02em;">47</div>
							<div style="font: 500 11px var(--font-mono); color: var(--brand-2); margin-top: 2px;">↑ +12 today</div>
						</div>
					</aside>
				</template>
			</div>
			</Transition>
		</div>
	</div>
</template>

<style scoped>
/* ── Tab row ── */
.pv-wrap {
	position: relative;
	z-index: 1;
	padding: 12px 32px 80px;
	max-width: 1180px;
	margin: 0 auto;
}

.pv-tabs {
	display: flex;
	gap: 4px;
	justify-content: center;
	margin-bottom: 14px;
}

.pv-tab {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 7px 14px;
	background: transparent;
	border: 1px solid transparent;
	color: var(--dim);
	font: 500 13px var(--font-sans);
	font-family: inherit;
	border-radius: var(--r-full);
	cursor: pointer;
	overflow: hidden;
	transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.pv-tab:hover { color: var(--fg-hi); }
.pv-tab--active {
	color: var(--fg-hi);
	background: color-mix(in oklab, var(--bg-1) 80%, transparent);
	border-color: var(--line);
}

.pv-tab-prog {
	position: absolute;
	bottom: -1px;
	left: 0;
	width: 0%;
	height: 2px;
	background: linear-gradient(90deg, var(--brand), var(--brand-2));
	border-radius: 1px;
	animation: tab-prog var(--dur, 4500ms) linear forwards;
}
@keyframes tab-prog { to { width: 100%; } }

.tab-enter-active { transition: opacity 0.18s ease; }
.tab-leave-active { transition: opacity 0.14s ease; }
.tab-enter-from   { opacity: 0; }
.tab-leave-to     { opacity: 0; }

/* ── Window chrome ── */
.pv-window {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 16px;
	overflow: hidden;
	box-shadow:
		0 0 0 1px rgba(255,255,255,.02) inset,
		0 60px 140px -40px color-mix(in oklab, var(--brand-glow) 70%, transparent),
		0 30px 80px -20px rgba(0,0,0,.7);
}

.pv-hd {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 12px 16px;
	border-bottom: 1px solid var(--line);
	background: linear-gradient(to bottom, color-mix(in oklab, var(--bg-2) 70%, var(--bg-1)), var(--bg-1));
}

.pv-hd__dots {
	display: flex;
	gap: 6px;
}
.pv-hd__dots i {
	display: inline-block;
	width: 11px;
	height: 11px;
	border-radius: 50%;
	background: var(--bg-3);
	border: 1px solid var(--line);
}

.pv-hd__url {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	padding: 5px 10px;
	font: 400 12px var(--font-mono);
	color: var(--mute);
}

.pv-esc {
	margin-left: auto;
	font: 500 10.5px var(--font-mono);
	padding: 2px 6px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: var(--r-xs);
	color: var(--dim);
}

/* ── Window body ── */
.pv-body {
	display: grid;
	grid-template-columns: 240px 1fr 220px;
	height: 520px;
}

/* ── Sidebar ── */
.pv-side,
.pv-side-r {
	border-right: 1px solid var(--line);
	padding: 18px 14px;
	overflow: hidden;
}
.pv-side-r {
	border-right: 0;
	border-left: 1px solid var(--line);
}

.pv-side h5,
.pv-side-r h5 {
	margin: 14px 0 6px;
	font: 600 10.5px var(--font-mono);
	letter-spacing: .08em;
	text-transform: uppercase;
	color: var(--mute);
}
.pv-side h5:first-child,
.pv-side-r h5:first-child { margin-top: 0; }

.pv-side ul,
.pv-side-r ul {
	list-style: none;
	padding: 0;
	margin: 0;
}

.pv-side ul li,
.pv-side-r ul li {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 8px;
	border-radius: var(--r-sm);
	font: 500 12.5px var(--font-sans);
	color: var(--dim);
	cursor: pointer;
	margin-bottom: 1px;
	transition: background 0.1s, color 0.1s;
}
.pv-side ul li:hover,
.pv-side-r ul li:hover {
	background: rgba(255,255,255,.03);
	color: var(--fg-hi);
}
.pv-side ul li.active,
.pv-side-r ul li.active {
	background: color-mix(in oklab, var(--brand-soft) 80%, transparent);
	color: var(--fg-hi);
}

.ic {
	display: inline-flex;
	width: 14px;
	color: var(--mute);
}
li.active .ic { color: var(--brand); }

.badge-num {
	margin-left: auto;
	font: 600 10px var(--font-mono);
	padding: 1px 6px;
	background: var(--brand);
	color: var(--bg-0);
	border-radius: var(--r-full);
}

/* ── Main area ── */
.pv-main {
	padding: 18px;
	overflow: hidden;
}

/* Search bar */
.pv-search {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 10px;
	margin-bottom: 18px;
	color: var(--dim);
}

.pv-search__q {
	flex: 1;
	font: 400 14px var(--font-sans);
	color: var(--fg-hi);
}

.pv-cursor {
	display: inline-block;
	width: 1.5px;
	height: 16px;
	background: var(--brand);
	vertical-align: -3px;
	margin-left: 2px;
	animation: blink 1s steps(1) infinite;
}
@keyframes blink { 50% { opacity: 0; } }

/* Search results */
.pv-section-label {
	font: 500 10.5px var(--font-mono);
	color: var(--mute);
	letter-spacing: .06em;
	text-transform: uppercase;
	margin: 16px 4px 8px;
}

.pv-result {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 14px;
	border: 1px solid var(--line);
	border-radius: 10px;
	margin-bottom: 8px;
	background: color-mix(in oklab, var(--bg-2) 50%, transparent);
}

.pv-result--featured {
	border-color: color-mix(in oklab, var(--brand) 50%, var(--line));
	background: color-mix(in oklab, var(--brand-soft) 70%, var(--bg-2));
	box-shadow: 0 0 24px -8px var(--brand-soft);
}

.pv-result__ic {
	display: inline-grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: var(--r-md);
	background: var(--bg-3);
	color: var(--brand);
	border: 1px solid var(--line);
	flex-shrink: 0;
}

.pv-result__ic--featured {
	background: var(--brand);
	color: var(--bg-0);
	border-color: transparent;
}

.pv-result__body { flex: 1; }
.pv-result__body h6 {
	margin: 0 0 2px;
	font: 600 13.5px var(--font-sans);
	color: var(--fg-hi);
}
.pv-result__body p {
	margin: 0;
	font: 400 12.5px/1.5 var(--font-sans);
	color: var(--dim);
}

.pv-result__arr { color: var(--mute); }

.pv-tag {
	display: inline-block;
	font: 600 9.5px var(--font-mono);
	padding: 2px 6px;
	border-radius: 3px;
	background: var(--brand);
	color: var(--bg-0);
	margin-right: 8px;
	letter-spacing: .04em;
}

/* ── Dashboard ── */
.pv-dash {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.dash-hd {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
}

.dash-title {
	font: 600 18px/1.3 var(--font-sans);
	letter-spacing: -0.01em;
	color: var(--fg-hi);
	margin: 0;
}

.dash-live {
	display: flex;
	align-items: center;
	gap: 8px;
}

.b-mono {
	font: 500 11px var(--font-mono);
	color: var(--dim);
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: var(--r-xs);
	padding: 2px 6px;
}

.chip-status {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 11.5px var(--font-sans);
	color: var(--dim);
}

.chip-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 6px var(--ok);
}

.dash-stats {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 8px;
}

.stat {
	padding: 12px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 10px;
}

.stat-l {
	font: 500 11px var(--font-sans);
	color: var(--mute);
	margin-bottom: 4px;
	text-transform: uppercase;
	letter-spacing: .04em;
}

.stat-v {
	font: 600 20px var(--font-sans);
	color: var(--fg-hi);
	margin-bottom: 2px;
}

.stat-d {
	font: 500 11px var(--font-mono);
	color: var(--brand-2);
}
.stat-d--ok { color: var(--ok); }

.dash-card {
	padding: 14px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 10px;
}

.dash-card-hd {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.dash-card-title {
	font: 600 12px var(--font-sans);
	color: var(--fg-hi);
}

.dash-segs { display: flex; gap: 4px; }

.seg {
	font: 500 11px var(--font-sans);
	color: var(--dim);
	padding: 3px 8px;
	border-radius: var(--r-full);
	cursor: pointer;
	transition: background 0.1s, color 0.1s;
}
.seg--active {
	background: var(--bg-3);
	color: var(--fg-hi);
}

/* ── Errors sidebar list ── */
.err-list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.err-list li {
	display: block;
	padding: 7px 6px;
	border-radius: var(--r-sm);
	font: 500 11.5px/1.4 var(--font-sans);
	color: var(--dim);
	cursor: pointer;
	margin-bottom: 2px;
}

.err-list li:hover { background: rgba(255,255,255,.03); }

.lvl {
	display: inline-block;
	font: 600 9px var(--font-mono);
	padding: 1px 5px;
	border-radius: 3px;
	margin-right: 6px;
	letter-spacing: .04em;
}

.lvl--err {
	background: color-mix(in oklab, var(--err) 25%, transparent);
	color: var(--err);
	border: 1px solid color-mix(in oklab, var(--err) 50%, transparent);
}

.lvl--warn {
	background: color-mix(in oklab, var(--warn) 22%, transparent);
	color: var(--warn);
	border: 1px solid color-mix(in oklab, var(--warn) 45%, transparent);
}

/* ── Errors table ── */
.err-table {
	margin-top: 12px;
	border: 1px solid var(--line);
	border-radius: 8px;
	overflow: hidden;
}

.err-table-row {
	display: grid;
	grid-template-columns: 60px 1fr 50px 70px;
	gap: 8px;
	padding: 8px 12px;
	align-items: center;
	font: 400 11.5px var(--font-sans);
	color: var(--dim);
	border-bottom: 1px solid var(--line);
}

.err-table-row:last-child { border-bottom: 0; }

.err-table-row--header {
	background: var(--bg-2);
	font: 600 10px var(--font-mono);
	color: var(--mute);
	letter-spacing: .06em;
	text-transform: uppercase;
}

.err-table-row--err:hover,
.err-table-row--warn:hover {
	background: rgba(255,255,255,.02);
	cursor: pointer;
}

.err-time {
	font: 400 11px var(--font-mono);
	color: var(--mute);
}

/* ── Docs tab ── */
.pv-proj-btn {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: var(--r-sm);
	font: 500 12.5px var(--font-sans);
	color: var(--fg-hi);
	margin-bottom: 14px;
	cursor: pointer;
}

.pv-doc {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.doc-breadcrumb {
	font: 500 11px var(--font-mono);
	color: var(--mute);
	letter-spacing: .06em;
	text-transform: uppercase;
}

.doc-title {
	margin: 0;
	font: 600 20px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
}

.doc-lede {
	margin: 0;
	font: 400 13px/1.6 var(--font-sans);
	color: var(--dim);
}

.doc-steps {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.doc-step {
	display: flex;
	gap: 12px;
	align-items: flex-start;
	padding: 12px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
}

.step-num {
	width: 22px;
	height: 22px;
	display: inline-grid;
	place-items: center;
	border-radius: 50%;
	background: var(--bg-3);
	border: 1px solid var(--line);
	font: 600 11px var(--font-mono);
	color: var(--mute);
	flex-shrink: 0;
}

.doc-step-active {
	background: var(--brand);
	border-color: transparent;
	color: var(--bg-0);
}

.step-title {
	font: 600 12.5px var(--font-sans);
	color: var(--fg-hi);
	margin-bottom: 3px;
}

.step-desc {
	font: 400 12px/1.5 var(--font-sans);
	color: var(--dim);
}

.step-desc code {
	font-family: var(--font-mono);
	font-size: 11px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	padding: 1px 4px;
	border-radius: 3px;
	color: var(--brand);
}

.toc-foot-mini {
	margin-top: 16px;
	padding-top: 12px;
	border-top: 1px solid var(--line);
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.toc-foot-mini span {
	font: 500 11.5px var(--font-sans);
	color: var(--dim);
	cursor: pointer;
	padding: 3px 0;
}

.toc-foot-mini span:hover { color: var(--fg-hi); }

/* ── Errors card wrapper ── */
.err-card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	overflow: hidden;
}

.err-card-hd {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	border-bottom: 1px solid var(--line);
}

.err-card-title {
	font: 600 14px var(--font-sans);
	color: var(--fg-hi);
	margin-bottom: 2px;
}

.err-card-sub {
	font: 400 12px var(--font-sans);
	color: var(--mute);
}

/* ── Dashboard KPI trends ── */
.stat-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
}

.stat-trend {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 7px;
	border-radius: 9999px;
	border: 1px solid var(--line);
	font: 500 10.5px var(--font-mono);
	background: var(--bg-3);
	color: var(--fg-hi);
	white-space: nowrap;
	flex-shrink: 0;
}

.stat-trend.up   { color: var(--brand-2); border-color: color-mix(in oklab, var(--brand-2) 40%, var(--line)); }
.stat-trend.down { color: var(--err);     border-color: color-mix(in oklab, var(--err) 40%, var(--line)); }

.stat-cap {
	margin-top: 6px;
	font: 500 11px var(--font-sans);
	color: var(--fg-hi);
}

@media (max-width: 768px) {
	.pv-wrap {
		padding: 8px 16px 60px;
	}

	.pv-body {
		grid-template-columns: 1fr;
		height: 520px;
		overflow: hidden;
	}

	.pv-side,
	.pv-side-r {
		display: none;
	}

	.dash-stats {
		grid-template-columns: repeat(2, 1fr);
	}

	.pv-hd__url span:not(.pv-esc) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 160px;
	}
}
</style>
