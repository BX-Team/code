<script setup lang="ts">
import { Bell, Plus, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';
import { api } from '@/lib/api';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });
useHead({ title: 'Alerts', titleTemplate: '%s | Pulsify' });

type AlertType = 'new_issue' | 'regression' | 'error_spike';

interface AlertRule {
  id: string;
  type: AlertType;
  enabled: boolean;
  threshold: number;
  windowMinutes: number;
  webhookUrl: string;
  lastFiredAt: string | null;
  createdAt: string;
}

const TYPE_META: Record<AlertType, { label: string; desc: string }> = {
  new_issue: { label: 'New issue', desc: 'Fires the first time a distinct error is seen.' },
  regression: { label: 'Regression', desc: 'Fires when a resolved issue reappears on a newer version.' },
  error_spike: { label: 'Error spike', desc: 'Fires when errors exceed a threshold within a time window.' },
};

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const { data, pending, refresh } = await useAsyncData<{ rules: AlertRule[] } | null>(
  `project-alerts-${slug.value}`,
  () =>
    project.value ? api<{ rules: AlertRule[] }>(`/pulsify/projects/${project.value.id}/alerts`) : Promise.resolve(null),
  { watch: [project] },
);

const form = reactive<{ type: AlertType; webhookUrl: string; threshold: number; windowMinutes: number }>({
  type: 'new_issue',
  webhookUrl: '',
  threshold: 10,
  windowMinutes: 5,
});
const creating = ref(false);

async function createRule() {
  if (!project.value || creating.value) return;
  if (!form.webhookUrl.trim()) {
    toast.error('Webhook URL is required');
    return;
  }
  creating.value = true;
  try {
    const body: Record<string, unknown> = { type: form.type, webhookUrl: form.webhookUrl.trim() };
    if (form.type === 'error_spike') {
      body.threshold = form.threshold;
      body.windowMinutes = form.windowMinutes;
    }
    await api(`/pulsify/projects/${project.value.id}/alerts`, { method: 'POST', body });
    toast.success('Alert rule created');
    form.webhookUrl = '';
    await refresh();
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to create rule');
  } finally {
    creating.value = false;
  }
}

const pendingIds = ref<Set<string>>(new Set());

async function toggleRule(rule: AlertRule) {
  if (!project.value || pendingIds.value.has(rule.id)) return;
  pendingIds.value.add(rule.id);
  try {
    await api(`/pulsify/projects/${project.value.id}/alerts/${rule.id}`, {
      method: 'PATCH',
      body: { enabled: !rule.enabled },
    });
    await refresh();
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to update rule');
  } finally {
    pendingIds.value.delete(rule.id);
  }
}

async function removeRule(rule: AlertRule) {
  if (!project.value || pendingIds.value.has(rule.id)) return;
  pendingIds.value.add(rule.id);
  try {
    await api(`/pulsify/projects/${project.value.id}/alerts/${rule.id}`, { method: 'DELETE' });
    toast.success('Alert rule deleted');
    await refresh();
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to delete rule');
  } finally {
    pendingIds.value.delete(rule.id);
  }
}

function ruleCondition(rule: AlertRule): string {
  if (rule.type === 'error_spike') return `> ${rule.threshold} errors / ${rule.windowMinutes}m`;
  return TYPE_META[rule.type].desc;
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname.length > 16 ? `${u.pathname.slice(0, 16)}…` : u.pathname}`;
  } catch {
    return url.slice(0, 40);
  }
}
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="not-found">Project not found.</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />

		<div class="alerts-wrap px-4 lg:px-6">
			<div class="page-title">
				<h2>Alerts</h2>
				<p>Get notified about errors via webhooks. Discord webhook URLs are formatted as embeds automatically.</p>
			</div>

			<div class="card">
				<div class="card-hd">
					<h3>New alert rule</h3>
					<p>Deliver a notification when the selected condition is met.</p>
				</div>
				<div class="form-content">
					<div class="type-grid">
						<button
							v-for="(meta, key) in TYPE_META"
							:key="key"
							class="type-card"
							:class="{ active: form.type === key }"
							@click="form.type = key as AlertType"
						>
							<span class="type-label">{{ meta.label }}</span>
							<span class="type-desc">{{ meta.desc }}</span>
						</button>
					</div>

					<div v-if="form.type === 'error_spike'" class="spike-fields">
						<div class="field">
							<label class="flbl" for="threshold">Threshold (errors)</label>
							<input id="threshold" v-model.number="form.threshold" type="number" min="1" class="inp" />
						</div>
						<div class="field">
							<label class="flbl" for="window">Window (minutes)</label>
							<input id="window" v-model.number="form.windowMinutes" type="number" min="1" class="inp" />
						</div>
					</div>

					<div class="field">
						<label class="flbl" for="webhook">Webhook URL</label>
						<input
							id="webhook"
							v-model="form.webhookUrl"
							class="inp"
							placeholder="https://discord.com/api/webhooks/…"
						/>
					</div>

					<button class="btn-primary" :disabled="creating" @click="createRule">
						<Plus :size="14" :stroke-width="2" />
						{{ creating ? 'Creating…' : 'Create rule' }}
					</button>
				</div>
			</div>

			<div class="card">
				<div class="card-hd">
					<h3>Active rules</h3>
					<p>Rules currently delivering notifications for this project.</p>
				</div>
				<div v-if="pending" class="rules-loading">Loading…</div>
				<div v-else-if="!data?.rules.length" class="rules-empty">
					<Bell :size="20" :stroke-width="1.5" />
					<span>No alert rules yet. Create one above.</span>
				</div>
				<div v-else class="rules-list">
					<div v-for="rule in data.rules" :key="rule.id" class="rule-row" :class="{ off: !rule.enabled }">
						<div class="rule-info">
							<div class="rule-top">
								<span class="rule-type">{{ TYPE_META[rule.type].label }}</span>
								<span class="rule-cond">{{ ruleCondition(rule) }}</span>
							</div>
							<div class="rule-url">{{ maskUrl(rule.webhookUrl) }}</div>
						</div>
						<label class="switch" :title="rule.enabled ? 'Enabled' : 'Disabled'">
							<input
								type="checkbox"
								:checked="rule.enabled"
								:disabled="pendingIds.has(rule.id)"
								@change="toggleRule(rule)"
							/>
							<span class="slider" />
						</label>
						<button
							class="del-btn"
							:disabled="pendingIds.has(rule.id)"
							title="Delete rule"
							@click="removeRule(rule)"
						>
							<Trash2 :size="14" :stroke-width="1.7" />
						</button>
					</div>
				</div>
			</div>
		</div>
	</template>
</template>

<style scoped>
.not-found {
	border: 1px solid var(--line);
	border-radius: 10px;
	padding: 48px;
	text-align: center;
	color: var(--mute);
}

.alerts-wrap {
	display: flex;
	flex-direction: column;
	gap: 18px;
	max-width: 720px;
	padding-top: 18px;
}

.page-title h2 { margin: 0; font: 600 20px var(--font-sans); color: var(--fg-hi); letter-spacing: -0.01em; }
.page-title p { margin: 4px 0 0; font: 400 13px var(--font-sans); color: var(--mute); }

.card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	overflow: hidden;
}
.card-hd { padding: 16px 18px 13px; border-bottom: 1px solid var(--line); }
.card-hd h3 { margin: 0 0 3px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.card-hd p { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }

.form-content { padding: 18px; display: flex; flex-direction: column; gap: 16px; }

.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
@media (max-width: 640px) { .type-grid { grid-template-columns: 1fr; } }
.type-card {
	display: flex;
	flex-direction: column;
	gap: 4px;
	text-align: left;
	padding: 12px;
	border: 1px solid var(--line);
	border-radius: 10px;
	background: var(--bg-2);
	cursor: pointer;
	transition: border-color .15s, background .15s;
}
.type-card:hover { border-color: var(--line-2); }
.type-card.active { border-color: var(--brand); background: color-mix(in oklab, var(--brand) 8%, var(--bg-2)); }
.type-label { font: 600 12.5px var(--font-sans); color: var(--fg-hi); }
.type-desc { font: 400 11px var(--font-sans); color: var(--mute); line-height: 1.4; }

.spike-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.flbl { font: 500 12.5px var(--font-sans); color: var(--dim); }
.inp {
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 9px 12px;
	font: 400 13.5px var(--font-sans);
	color: var(--fg-hi);
	outline: none;
	width: 100%;
	box-sizing: border-box;
}
.inp::placeholder { color: var(--mute); }
.inp:focus { border-color: var(--brand); }

.btn-primary {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	font: 500 12.5px var(--font-sans);
	background: var(--brand);
	border: 1px solid var(--brand);
	border-radius: 8px;
	color: var(--bg-0);
	cursor: pointer;
	width: fit-content;
}
.btn-primary:hover { box-shadow: 0 0 0 3px var(--brand-soft); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.rules-loading, .rules-empty {
	padding: 36px;
	text-align: center;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}
.rules-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; }

.rules-list { display: flex; flex-direction: column; }
.rule-row {
	display: grid;
	grid-template-columns: 1fr auto auto;
	align-items: center;
	gap: 14px;
	padding: 14px 18px;
	border-bottom: 1px solid var(--line);
}
.rule-row:last-child { border-bottom: 0; }
.rule-row.off { opacity: 0.55; }

.rule-info { min-width: 0; }
.rule-top { display: flex; align-items: center; gap: 8px; }
.rule-type { font: 600 13px var(--font-sans); color: var(--fg-hi); }
.rule-cond { font: 400 11.5px var(--font-mono); color: var(--mute); }
.rule-url {
	font: 400 11.5px var(--font-mono);
	color: var(--dim);
	margin-top: 3px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.switch { position: relative; display: inline-block; width: 38px; height: 22px; cursor: pointer; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
	position: absolute;
	inset: 0;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 999px;
	transition: background .15s;
}
.slider::before {
	content: '';
	position: absolute;
	width: 16px;
	height: 16px;
	left: 2px;
	top: 2px;
	background: var(--mute);
	border-radius: 50%;
	transition: transform .15s, background .15s;
}
.switch input:checked + .slider { background: color-mix(in oklab, var(--brand) 40%, transparent); border-color: var(--brand); }
.switch input:checked + .slider::before { transform: translateX(16px); background: var(--brand); }

.del-btn {
	display: inline-grid;
	place-items: center;
	width: 28px;
	height: 28px;
	border-radius: 6px;
	border: 1px solid var(--line);
	background: var(--bg-1);
	color: var(--mute);
	cursor: pointer;
	flex-shrink: 0;
	transition: color .15s, border-color .15s, background .15s;
}
.del-btn:hover:not(:disabled) {
	color: var(--err);
	border-color: color-mix(in oklab, var(--err) 50%, var(--line));
	background: color-mix(in oklab, var(--err) 12%, var(--bg-1));
}
.del-btn:disabled { opacity: 0.5; cursor: default; }

.px-4 { padding-left: 1rem; padding-right: 1rem; }
@media (min-width: 1024px) { .lg\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } }
</style>
