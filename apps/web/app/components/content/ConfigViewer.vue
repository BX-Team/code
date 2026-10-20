<script setup lang="ts">
interface Props {
  config: Record<string, any>;
  comments?: Record<string, string>;
  title?: string;
}
const props = withDefaults(defineProps<Props>(), {
  comments: () => ({}),
  title: 'Configuration',
});

type ItemType = 'section' | 'leaf' | 'array';

interface FlatItem {
  type: ItemType;
  key: string;
  path: string;
  depth: number;
  value: any;
}

const visibleComments = ref<Set<string>>(new Set());
const searchQuery = ref('');

function toggleComment(path: string) {
  const next = new Set(visibleComments.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  visibleComments.value = next;
}
function showAll() {
  visibleComments.value = new Set(Object.keys(props.comments));
}
function hideAll() {
  visibleComments.value = new Set();
}

const filteredConfig = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return props.config;
  function walk(obj: any, path = ''): any {
    const out: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cur = path ? `${path}.${key}` : key;
      const matches =
        key.toLowerCase().includes(q) ||
        (typeof value === 'string' && value.toLowerCase().includes(q)) ||
        cur.toLowerCase().includes(q);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = walk(value, cur);
        if (Object.keys(nested).length > 0 || matches) out[key] = matches ? value : nested;
      } else if (matches) {
        out[key] = value;
      }
    }
    return out;
  }
  return walk(props.config);
});

const isEmpty = computed(() => Object.keys(filteredConfig.value).length === 0);

const flatItems = computed<FlatItem[]>(() => {
  const items: FlatItem[] = [];
  function flatten(obj: any, depth: number, parentPath: string) {
    for (const [key, value] of Object.entries(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        items.push({ type: 'section', key, path, depth, value: null });
        flatten(value, depth + 1, path);
      } else if (Array.isArray(value)) {
        items.push({ type: 'array', key, path, depth, value });
      } else {
        items.push({ type: 'leaf', key, path, depth, value });
      }
    }
  }
  flatten(filteredConfig.value, 0, '');
  return items;
});

function escapeHtml(t: string) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function highlight(raw: unknown): string {
  const safe = escapeHtml(String(raw));
  const q = searchQuery.value.trim();
  if (!q) return safe;
  return safe.replace(new RegExp(`(${escapeRe(escapeHtml(q))})`, 'gi'), '<mark class="cv-mark">$1</mark>');
}

function valueClass(v: unknown) {
  if (v === true) return 'tk-true';
  if (v === false) return 'tk-false';
  if (typeof v === 'number') return 'tk-num';
  if (typeof v === 'string') return 'tk-str';
  return 'tk-default';
}
function fmtVal(v: unknown): string {
  if (typeof v === 'string') return v === '' ? '""' : `"${v}"`;
  return String(v);
}
</script>

<template>
	<div class="cv">
		<div class="cv-hd">
			<div class="cv-hd-top">
				<h3 class="cv-title">{{ title }}</h3>
				<div class="cv-acts">
					<button class="cv-btn primary" @click="showAll">Show all notes</button>
					<button class="cv-btn" @click="hideAll">Hide notes</button>
				</div>
			</div>
			<div class="cv-search-wrap">
				<svg class="cv-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input v-model="searchQuery" class="cv-input" type="text" placeholder="Search keys and values…" autocomplete="off" spellcheck="false" />
				<button v-if="searchQuery" class="cv-clear" aria-label="Clear search" @click="searchQuery = ''">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>

		<div class="cv-body">
			<p v-if="isEmpty" class="cv-empty">No settings found for "{{ searchQuery }}"</p>
			<div v-else class="cv-tree">
				<template v-for="item in flatItems" :key="item.path">
					<!-- Section header (object key) -->
					<div
						v-if="item.type === 'section'"
						class="cv-row cv-section"
						:class="{ 'cv-section--top': item.depth === 0 }"
						:style="{ paddingLeft: `${item.depth * 16 + 12}px` }"
					>
						<span class="cv-sec-key" v-html="highlight(item.key) + ':'" />
						<button v-if="comments[item.path]" class="cv-note-btn" @click="toggleComment(item.path)">
							{{ visibleComments.has(item.path) ? '▾ hide' : '▸ note' }}
						</button>
					</div>

					<!-- Leaf (scalar value) -->
					<div
						v-else-if="item.type === 'leaf'"
						class="cv-row cv-leaf"
						:style="{ paddingLeft: `${item.depth * 16 + 12}px` }"
					>
						<span class="cv-key" v-html="highlight(item.key) + ':&nbsp;'" />
						<span :class="['cv-val', valueClass(item.value)]" v-html="highlight(fmtVal(item.value))" />
						<button v-if="comments[item.path]" class="cv-note-btn" @click="toggleComment(item.path)">
							{{ visibleComments.has(item.path) ? '▾' : '▸' }}
						</button>
					</div>

					<!-- Array -->
					<div
						v-else-if="item.type === 'array'"
						:style="{ paddingLeft: `${item.depth * 16 + 12}px` }"
					>
						<div class="cv-row cv-leaf">
							<span class="cv-key" v-html="highlight(item.key) + ':'" />
							<button v-if="comments[item.path]" class="cv-note-btn" @click="toggleComment(item.path)">
								{{ visibleComments.has(item.path) ? '▾' : '▸' }}
							</button>
						</div>
						<div v-for="(el, i) in item.value" :key="i" class="cv-arr-item">
							<span class="cv-arr-dash">-</span>
							<span class="tk-str">{{ typeof el === 'object' ? JSON.stringify(el) : el }}</span>
						</div>
					</div>

					<!-- Note -->
					<div
						v-if="comments[item.path] && visibleComments.has(item.path)"
						class="cv-note"
						:style="{ marginLeft: `${item.depth * 16 + 12}px` }"
					>{{ comments[item.path] }}</div>
				</template>
			</div>
		</div>
	</div>
</template>

<style scoped>
.cv {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	margin: 22px 0;
}

/* ---- Header ---- */
.cv-hd {
	padding: 14px 16px;
	border-bottom: 1px solid var(--line);
}
.cv-hd-top {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}
.cv-title {
	margin: 0;
	font: 600 15px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.005em;
}
.cv-acts { display: flex; gap: 8px; }

.cv-btn {
	appearance: none;
	cursor: pointer;
	font: 500 11px var(--font-sans);
	padding: 5px 10px;
	border-radius: 6px;
	border: 1px solid var(--line);
	background: transparent;
	color: var(--mute);
	transition: color .15s, border-color .15s, background .15s;
}
.cv-btn:hover { color: var(--fg-hi); border-color: var(--line-2); background: var(--hover); }
.cv-btn.primary {
	color: var(--fg-hi);
	border-color: color-mix(in oklab, var(--brand) 50%, var(--line));
	background: color-mix(in oklab, var(--brand) 12%, transparent);
}
.cv-btn.primary:hover { border-color: var(--brand); background: color-mix(in oklab, var(--brand) 18%, transparent); }

.cv-search-wrap {
	position: relative;
	margin-top: 12px;
}
.cv-input {
	width: 100%;
	box-sizing: border-box;
	padding: 8px 36px 8px 34px;
	border-radius: 8px;
	border: 1px solid var(--line);
	background: var(--bg-0);
	color: var(--fg);
	font: 400 13px var(--font-sans);
	outline: none;
	transition: border-color .15s, box-shadow .15s;
}
.cv-input::placeholder { color: var(--mute); }
.cv-input:focus {
	border-color: var(--brand);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand) 20%, transparent);
}
.cv-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--mute); pointer-events: none; }
.cv-clear {
	position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
	appearance: none; background: transparent; border: 0; cursor: pointer;
	color: var(--mute); padding: 4px; display: inline-grid; place-items: center;
}
.cv-clear:hover { color: var(--fg-hi); }

/* ---- Body ---- */
.cv-body {
	background: var(--bg-0);
	border-radius: 0 0 12px 12px;
	padding: 8px 0 12px;
	overflow-x: hidden;
}

.cv-tree {
	font-family: var(--font-mono);
	font-size: 13px;
	line-height: 1.7;
}

/* ---- Rows ---- */
.cv-row {
	display: flex;
	align-items: baseline;
	gap: 6px;
	padding-top: 1px;
	padding-bottom: 1px;
	padding-right: 12px;
	border-radius: 4px;
	transition: background .12s;
	flex-wrap: wrap;
	min-width: 0;
}
.cv-row:hover { background: var(--hover); }

/* Section header */
.cv-section { margin-top: 4px; }
.cv-section--top {
	margin-top: 14px;
	padding-top: 12px;
	border-top: 1px solid var(--line);
}
.cv-section--top:first-child { margin-top: 0; padding-top: 4px; border-top: none; }

.cv-sec-key {
	font-weight: 600;
	color: var(--fg-hi);
	white-space: nowrap;
}

/* Leaf */
.cv-key { color: var(--dim); white-space: nowrap; }
.cv-val {
	white-space: normal;
	word-break: break-word;
	overflow-wrap: anywhere;
	min-width: 0;
	flex: 1 1 auto;
}

.tk-true  { color: var(--brand-2); }
.tk-false { color: var(--err); }
.tk-num   { color: oklch(0.78 0.14 320); }
.tk-str   { color: var(--brand-2); }
.tk-default { color: var(--fg); }

/* Array items */
.cv-arr-item {
	display: flex;
	align-items: baseline;
	gap: 8px;
	padding: 1px 12px 1px 28px;
	font-family: var(--font-mono);
	font-size: 13px;
}
.cv-arr-dash { color: var(--mute); flex-shrink: 0; }

/* Note button */
.cv-note-btn {
	appearance: none;
	border: 0;
	background: transparent;
	color: var(--mute);
	cursor: pointer;
	font: 500 12.5px var(--font-sans);
	padding: 2px 8px;
	white-space: nowrap;
	transition: color .15s;
	flex-shrink: 0;
}
.cv-note-btn:hover { color: var(--brand); }

/* Note / comment box */
.cv-note {
	margin-top: 4px;
	margin-bottom: 6px;
	margin-right: 12px;
	padding: 8px 12px;
	background: var(--bg-1);
	border-left: 2px solid var(--brand);
	border-radius: 4px;
	font: 400 12.5px/1.6 var(--font-sans);
	color: var(--fg);
	white-space: pre-wrap;
}

.cv-empty {
	padding: 28px 16px;
	text-align: center;
	color: var(--mute);
	font: 400 13px var(--font-sans);
}

:deep(.cv-mark) {
	background: color-mix(in oklab, var(--brand) 28%, transparent);
	color: var(--fg-hi);
	border-radius: 3px;
	padding: 0 2px;
	font-style: normal;
}
</style>
