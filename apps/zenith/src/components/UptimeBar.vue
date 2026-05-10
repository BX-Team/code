<script setup lang="ts">
import { computed } from 'vue';
import type { UptimeDay } from '../types';

const props = defineProps<{
  history: UptimeDay[];
}>();

const DAYS = 90;

interface Segment {
  kind: 'ok' | 'warn' | 'err' | 'partial' | 'partial-err' | 'no-data';
  date: string;
  pct: number | null;
}

const segments = computed((): Segment[] => {
  const byDate = new Map(props.history.map(d => [d.date, d]));
  const result: Segment[] = [];
  const now = Date.now();

  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const date = d.toISOString().slice(0, 10);
    const entry = byDate.get(date);

    if (!entry || entry.checks_total === 0) {
      result.push({ kind: 'no-data', date, pct: null });
      continue;
    }

    const pct = entry.checks_ok / entry.checks_total;
    let kind: Segment['kind'];
    if (pct === 1) kind = 'ok';
    else if (pct >= 0.95) kind = 'partial';
    else if (pct >= 0.8) kind = 'warn';
    else if (pct >= 0.5) kind = 'partial-err';
    else kind = 'err';

    result.push({ kind, date, pct: Math.round(pct * 10000) / 100 });
  }

  return result;
});

function label(seg: Segment): string {
  if (seg.kind === 'no-data') return 'No data';
  if (seg.kind === 'ok') return 'Operational';
  if (seg.kind === 'warn') return 'Degraded';
  if (seg.kind === 'err') return 'Outage';
  return 'Partial degradation';
}
</script>

<template>
	<div class="uptime">
		<span v-for="(seg, i) in segments" :key="i" class="seg" :class="seg.kind !== 'ok' ? seg.kind : ''">
			<span class="tip" :class="seg.kind === 'err' ? 'err' : seg.kind === 'warn' ? 'warn' : ''">
				<div class="row"><span>{{ seg.date }}</span></div>
				<div class="row">
					<span class="v">{{ label(seg) }}</span>
					<span v-if="seg.pct !== null" class="p">{{ seg.pct }}%</span>
				</div>
			</span>
		</span>
	</div>
</template>

<style scoped>
.uptime {
	display: flex;
	align-items: stretch;
	gap: 2px;
	width: 360px;
}

.seg {
	flex: 1;
	height: 30px;
	border-radius: 2px;
	background: var(--brand-2);
	position: relative;
	transition: transform 0.12s;
}

.seg:hover {
	transform: scaleY(1.15);
}

.seg.warn {
	background: var(--warn);
}

.seg.err {
	background: var(--err);
}

.seg.partial {
	background: linear-gradient(180deg, var(--brand-2) 0% 60%, var(--warn) 60% 100%);
}

.seg.partial-err {
	background: linear-gradient(180deg, var(--brand-2) 0% 70%, var(--err) 70% 100%);
}

.seg.no-data {
	background: var(--bg-3);
	border: 1px solid var(--line);
}

.tip {
	position: absolute;
	bottom: calc(100% + 8px);
	left: 50%;
	transform: translateX(-50%);
	white-space: nowrap;
	background: var(--bg-2);
	border: 1px solid var(--line-2);
	border-radius: 6px;
	padding: 6px 9px;
	font: 500 11px var(--font-mono);
	color: var(--fg-hi);
	pointer-events: none;
	opacity: 0;
	transition: opacity 0.12s;
	z-index: 5;
}

.seg:hover .tip {
	opacity: 1;
}

.tip .row {
	display: flex;
	gap: 8px;
	align-items: center;
}

.tip .row .v {
	color: var(--brand-2);
}

.tip.warn .row .v {
	color: var(--warn);
}

.tip.err .row .v {
	color: var(--err);
}

.tip .p {
	color: var(--mute);
}
</style>
