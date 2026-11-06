<script setup lang="ts">
import { ArrowLeftRight } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { syncQuery } from '@/lib/query';

useHead({
  title: 'Coordinate calculator',
  meta: [
    {
      name: 'description',
      content:
        'Convert coordinates between the Nether and the Overworld, and find a stronghold from two Eye of Ender throws.',
    },
  ],
});

const route = useRoute();
const fromQuery = (key: string) => (typeof route.query[key] === 'string' ? (route.query[key] as string) : '');

const num = (text: string): number | null => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
};

/** The Nether is an eighth of the Overworld horizontally; Y is never scaled. */
const SCALE = 8;

const dimension = ref<'overworld' | 'nether'>(fromQuery('from') === 'nether' ? 'nether' : 'overworld');
const x = ref(fromQuery('x'));
const y = ref(fromQuery('y'));
const z = ref(fromQuery('z'));

const converted = computed(() => {
  const [px, pz] = [num(x.value), num(z.value)];
  if (px === null || pz === null) return null;
  const factor = dimension.value === 'overworld' ? 1 / SCALE : SCALE;
  return { x: Math.floor(px * factor), y: num(y.value), z: Math.floor(pz * factor) };
});

const target = computed(() => (dimension.value === 'overworld' ? 'Nether' : 'Overworld'));

function swap() {
  if (converted.value) {
    x.value = String(converted.value.x);
    z.value = String(converted.value.z);
  }
  dimension.value = dimension.value === 'overworld' ? 'nether' : 'overworld';
}

interface Throw {
  x: string;
  z: string;
  angle: string;
}

const throws = ref<[Throw, Throw]>([
  { x: fromQuery('x1'), z: fromQuery('z1'), angle: fromQuery('a1') },
  { x: fromQuery('x2'), z: fromQuery('z2'), angle: fromQuery('a2') },
]);

/** Minecraft's yaw: 0 faces +Z (south), 90 faces −X (west). */
const direction = (yaw: number) => {
  const radians = (yaw * Math.PI) / 180;
  return { dx: -Math.sin(radians), dz: Math.cos(radians) };
};

const stronghold = computed(() => {
  const parsed = throws.value.map(t => ({ x: num(t.x), z: num(t.z), angle: num(t.angle) }));
  if (parsed.some(t => t.x === null || t.z === null || t.angle === null)) return null;
  const [a, b] = parsed as { x: number; z: number; angle: number }[] as [
    { x: number; z: number; angle: number },
    { x: number; z: number; angle: number },
  ];

  const da = direction(a.angle);
  const db = direction(b.angle);
  const cross = da.dx * db.dz - da.dz * db.dx;
  if (Math.abs(cross) < 1e-3)
    return { error: 'The two throws point the same way. Walk sideways a few hundred blocks and throw again.' };

  const ox = b.x - a.x;
  const oz = b.z - a.z;
  const t = (ox * db.dz - oz * db.dx) / cross;
  const u = (ox * da.dz - oz * da.dx) / cross;
  if (t < 0 || u < 0)
    return { error: 'The lines cross behind you. Check that both angles were read while facing the eye.' };

  const sx = Math.round(a.x + t * da.dx);
  const sz = Math.round(a.z + t * da.dz);
  const distance = Math.round(Math.hypot(sx - b.x, sz - b.z));
  return {
    x: sx,
    z: sz,
    distance,
    nether: { x: Math.floor(sx / SCALE), z: Math.floor(sz / SCALE) },
    // Throws taken close together leave a narrow angle, and a small reading error moves the point a lot.
    shallow: Math.abs(Math.asin(Math.min(1, Math.abs(cross)))) < (10 * Math.PI) / 180,
  };
});

watch(
  [dimension, x, y, z, throws],
  () => {
    const [a, b] = throws.value;
    syncQuery({
      from: dimension.value === 'nether' ? 'nether' : undefined,
      x: x.value,
      y: y.value,
      z: z.value,
      x1: a.x,
      z1: a.z,
      a1: a.angle,
      x2: b.x,
      z2: b.z,
      a2: b.angle,
    });
  },
  { deep: true, flush: 'post' },
);
</script>

<template>
	<ToolsToolPage
		title="Coordinate calculator"
		lead="Line a Nether portal up with its Overworld side, or find a stronghold from two Eye of Ender throws."
	>
		<div class="grid">
			<section class="panel card">
				<header class="card__head">
					<h2>Nether and Overworld</h2>
					<p>One block in the Nether is eight in the Overworld. Y stays the same.</p>
				</header>

				<div class="dims" role="radiogroup" aria-label="Coordinates are in">
					<button
						v-for="d in ['overworld', 'nether'] as const"
						:key="d"
						type="button"
						role="radio"
						class="chip"
						:class="{ on: dimension === d }"
						:aria-checked="dimension === d"
						@click="dimension = d"
					>
						{{ d === 'overworld' ? 'Overworld' : 'Nether' }}
					</button>
				</div>

				<div class="xyz">
					<label class="field"><span class="label">X</span><input v-model="x" class="input" inputmode="decimal" placeholder="1200" /></label>
					<label class="field"><span class="label">Y</span><input v-model="y" class="input" inputmode="decimal" placeholder="64" /></label>
					<label class="field"><span class="label">Z</span><input v-model="z" class="input" inputmode="decimal" placeholder="-340" /></label>
				</div>

				<div class="out">
					<span class="label">{{ target }}</span>
					<p v-if="converted" class="out__coords">
						<span>X <b>{{ converted.x }}</b></span>
						<span v-if="converted.y !== null">Y <b>{{ converted.y }}</b></span>
						<span>Z <b>{{ converted.z }}</b></span>
					</p>
					<p v-else class="hint">Enter X and Z.</p>
					<button type="button" class="btn swap" :disabled="!converted" @click="swap">
						<ArrowLeftRight :size="15" :stroke-width="1.9" />
						<span>Go the other way</span>
					</button>
				</div>
			</section>

			<section class="panel card">
				<header class="card__head">
					<h2>Stronghold</h2>
					<p>Two throws, each with your position and the angle you faced. The lines cross at the stronghold.</p>
				</header>

				<div v-for="(t, i) in throws" :key="i" class="throw">
					<span class="label">{{ i === 0 ? 'First throw' : 'Second throw' }}</span>
					<div class="xyz">
						<label class="field"><span class="label sub">X</span><input v-model="t.x" class="input" inputmode="decimal" /></label>
						<label class="field"><span class="label sub">Z</span><input v-model="t.z" class="input" inputmode="decimal" /></label>
						<label class="field"><span class="label sub">Angle</span><input v-model="t.angle" class="input" inputmode="decimal" placeholder="-34.5" /></label>
					</div>
				</div>

				<div class="out">
					<span class="label">Stronghold, approximately</span>
					<template v-if="stronghold && 'x' in stronghold">
						<p class="out__coords">
							<span>X <b>{{ stronghold.x }}</b></span>
							<span>Z <b>{{ stronghold.z }}</b></span>
						</p>
						<p class="hint">
							{{ stronghold.distance }} blocks from the second throw · Nether X {{ stronghold.nether.x }}, Z {{ stronghold.nether.z }}
						</p>
						<p v-if="stronghold.shallow" class="hint bad">
							The throws are nearly parallel, so the estimate is rough. Move further sideways for the second one.
						</p>
					</template>
					<p v-else-if="stronghold" class="hint bad">{{ stronghold.error }}</p>
					<p v-else class="hint">Fill in both throws.</p>
				</div>
			</section>
		</div>

		<section class="section">
			<h2>Finding a stronghold</h2>
			<div class="explain">
				<article>
					<h3>1. First throw</h3>
					<p>
						Throw an Eye of Ender, look straight at it and open F3. Write down X and Z from <code>XYZ</code> and the first
						number from <code>Facing</code>.
					</p>
				</article>
				<article>
					<h3>2. Second throw</h3>
					<p>
						Walk 250 to 500 blocks to the side — not towards the eye — and do the same again. The wider the angle between
						the two lines, the closer the result.
					</p>
				</article>
				<article>
					<h3>3. Dig down</h3>
					<p>
						Go to the coordinates above and throw one more eye to confirm. When it falls, you are standing over the
						stronghold.
					</p>
				</article>
			</div>
		</section>
	</ToolsToolPage>
</template>

<style scoped>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
	gap: 16px;
}

.card {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.card__head h2 {
	margin: 0 0 4px;
	font: 700 18px/1.3 var(--font-sans);
	letter-spacing: -0.02em;
	color: var(--fg-hi);
}

.card__head p {
	margin: 0;
	font: 400 13.5px/1.55 var(--font-sans);
	color: var(--dim);
}

.dims {
	display: flex;
	gap: 6px;
}

.dims .chip {
	min-height: 44px;
	padding: 0 16px;
}

.xyz {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
}

.throw {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.label.sub {
	font-size: 10px;
}

.out {
	/* Both cards share a row height, so their results line up along the bottom. */
	margin-top: auto;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px;
	border: 1px solid var(--line);
	border-radius: var(--r-3);
	background: var(--surface-1);
}

.out__coords {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 20px;
	margin: 0;
	font: 400 15px/1.4 var(--font-mono);
	color: var(--mute);
}

.out__coords b {
	font-size: 22px;
	font-weight: 600;
	color: var(--fg-hi);
	font-variant-numeric: tabular-nums;
}

.swap {
	align-self: flex-start;
	margin-top: 4px;
}
</style>
