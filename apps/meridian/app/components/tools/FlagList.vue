<script setup lang="ts">
import { computed } from 'vue';
import { describeGraalProp, explainFlag, type FlagGroup } from '@/lib/flags/explain';

const props = defineProps<{ flags: string[] }>();

const GROUP_LABELS: Record<FlagGroup, string> = {
  gc: 'Garbage collector',
  heap: 'Heap and memory',
  jit: 'JIT and code cache',
  intrinsics: 'CPU intrinsics',
  platform: 'Threads and platform',
  system: 'System properties',
};

const ORDER: FlagGroup[] = ['gc', 'heap', 'jit', 'intrinsics', 'platform', 'system'];

const groups = computed(() => {
  const buckets = new Map<FlagGroup, ReturnType<typeof explainFlag>[]>();
  for (const raw of props.flags) {
    const flag = explainFlag(raw);
    if (!flag.description) flag.description = describeGraalProp(raw);
    const bucket = buckets.get(flag.group);
    if (bucket) bucket.push(flag);
    else buckets.set(flag.group, [flag]);
  }
  return ORDER.filter(group => buckets.has(group)).map(group => ({
    group,
    label: GROUP_LABELS[group],
    flags: buckets.get(group) as ReturnType<typeof explainFlag>[],
  }));
});
</script>

<template>
	<div class="fl">
		<section v-for="section in groups" :key="section.group" class="fl-group">
			<h3>
				{{ section.label }}
				<span>{{ section.flags.length }}</span>
			</h3>

			<div class="fl-rows">
				<div v-for="flag in section.flags" :key="flag.raw" class="fl-row">
					<code class="fl-name" :class="{ off: flag.disabled }">{{ flag.raw }}</code>
					<p v-if="flag.description" class="fl-desc">
						<span v-if="flag.disabled" class="fl-off-tag">turned off:</span>
						{{ flag.description }}
					</p>
					<p v-else class="fl-desc muted">No note for this one yet.</p>
				</div>
			</div>
		</section>
	</div>
</template>

<style scoped>
.fl {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.fl-group h3 {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0 0 10px;
	font: 600 11px/1.4 var(--font-sans);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--mute);
}

.fl-group h3 span {
	padding: 2px 6px;
	border-radius: var(--r-full);
	background: var(--bg-2);
	font-size: 10px;
	letter-spacing: 0;
}

.fl-rows {
	display: grid;
	gap: 1px;
	background: var(--line);
	border: 1px solid var(--line);
	border-radius: var(--r-md);
	overflow: hidden;
}

.fl-row {
	min-width: 0;
	display: grid;
	grid-template-columns: minmax(240px, 340px) 1fr;
	gap: 16px;
	padding: 10px 14px;
	background: var(--bg-1);
	align-items: baseline;
}

.fl-name {
	font: 500 12px/1.5 var(--font-mono);
	color: var(--brand);
	word-break: break-all;
}

.fl-name.off {
	color: var(--mute);
}

.fl-desc {
	margin: 0;
	font: 400 13px/1.6 var(--font-sans);
	color: var(--dim);
}

.fl-desc.muted {
	color: var(--mute);
}

.fl-off-tag {
	color: var(--warn);
	font-weight: 500;
}

@media (max-width: 720px) {
	.fl-row {
		grid-template-columns: 1fr;
		gap: 4px;
	}
}
</style>
