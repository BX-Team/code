<script setup lang="ts">
import { Copy, Plus, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface DsnToken {
	id: string
	label: string | null
	revoked: boolean
	lastUsedAt: string | null
	createdAt: string
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: projects } = await useProjects()
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null)

const { data: tokens, refresh: refreshTokens, pending } = await useAsyncData<DsnToken[]>(
	`project-tokens-${slug.value}`,
	() => project.value ? $fetch<DsnToken[]>(`/api/v3/projects/${project.value.id}/tokens`) : Promise.resolve([]),
)

const { openConfirm } = useConfirmDialog()

const newLabel = ref('')
const justCreated = ref<{ key: string; label: string | null } | null>(null)
const creating = ref(false)

const ingestHost = computed(() => {
	if (typeof window === 'undefined') return 'ingest.bxteam.org'
	return `ingest.${window.location.hostname.replace(/^www\./, '')}`
})

const dsnPreview = computed(() => {
	if (!justCreated.value || !project.value) return ''
	return `https://${justCreated.value.key}@${ingestHost.value}/api/v1/${project.value.id}`
})

async function createToken() {
	if (creating.value || !project.value) return
	creating.value = true
	try {
		const result = await $fetch<{ id: string; key: string; label: string | null; createdAt: string }>(
			`/api/v3/projects/${project.value.id}/tokens`,
			{ method: 'POST', body: { label: newLabel.value || undefined } },
		)
		justCreated.value = { key: result.key, label: result.label }
		newLabel.value = ''
		await refreshTokens()
		toast.success('Token created')
	} catch (err: any) {
		toast.error(err?.data?.message ?? err?.message ?? 'Failed to create token')
	} finally {
		creating.value = false
	}
}

async function revokeToken(tokenId: string) {
	if (!project.value) return
	const confirmed = await openConfirm({
		title: 'Revoke token?',
		message: 'Servers using this token will stop being able to send events.',
		danger: true,
		confirmText: 'Revoke',
	})
	if (!confirmed) return
	try {
		await $fetch(`/api/v3/projects/${project.value.id}/tokens/${tokenId}`, { method: 'DELETE' })
		await refreshTokens()
		toast.success('Token revoked')
	} catch (err: any) {
		toast.error(err?.data?.message ?? err?.message ?? 'Failed to revoke token')
	}
}

function copy(text: string) {
	navigator.clipboard?.writeText(text)
	toast.success('Copied to clipboard')
}

const deleting = ref(false)

async function deleteProject() {
	if (!project.value) return
	const confirmed = await openConfirm({
		title: `Delete "${project.value.name}"?`,
		message: 'All associated data, tokens, and events will be permanently removed.',
		danger: true,
		confirmText: 'Delete project',
	})
	if (!confirmed) return
	deleting.value = true
	try {
		await $fetch(`/api/v3/projects/${project.value.id}`, { method: 'DELETE' })
		await refreshNuxtData('v3-projects')
		await refreshNuxtData('v3-overview')
		await navigateTo('/dashboard')
	} catch (err: any) {
		toast.error(err?.data?.message ?? err?.message ?? 'Failed to delete project')
		deleting.value = false
	}
}
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="not-found">Project not found.</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />

		<div class="settings-wrap px-4 lg:px-6">
			<!-- Project info card -->
			<div class="card">
				<div class="card-hd">
					<h3>Project</h3>
					<p>Identifying details for this Pulsify workspace.</p>
				</div>
				<div class="info-rows">
					<div class="info-row"><span class="il">Name</span><span class="iv">{{ project.name }}</span></div>
					<div class="info-row"><span class="il">Slug</span><span class="iv mono">{{ project.slug }}</span></div>
					<div class="info-row">
						<span class="il">Type</span>
						<span class="type-badge">{{ project.type }}</span>
					</div>
					<div class="info-row">
						<span class="il">Project ID</span>
						<button class="copy-row" @click="copy(project.id)">
							<span class="mono small">{{ project.id }}</span>
							<Copy :size="12" :stroke-width="1.7" />
						</button>
					</div>
				</div>
			</div>

			<!-- DSN tokens -->
			<div class="card">
				<div class="card-hd">
					<h3>DSN tokens</h3>
					<p>Each Pulsify SDK uses a token to authenticate events.</p>
				</div>

				<form class="token-form" @submit.prevent="createToken">
					<div class="field">
						<label class="flbl">Token label <span class="opt">(optional)</span></label>
						<input v-model="newLabel" class="inp" placeholder="production / staging / dev-laptop" maxlength="64" />
					</div>
					<button type="submit" class="btn-primary" :disabled="creating">
						<Plus :size="13" :stroke-width="2" />
						{{ creating ? 'Creating…' : 'Create token' }}
					</button>
				</form>

				<div v-if="justCreated" class="dsn-reveal">
					<p class="dsn-label">Token created — copy now, you won't see it again.</p>
					<div class="dsn-row">
						<code class="dsn-code">{{ dsnPreview }}</code>
						<button class="icon-btn" @click="copy(dsnPreview)"><Copy :size="14" :stroke-width="1.7" /></button>
					</div>
				</div>

				<div v-if="pending && !tokens?.length" class="token-loading">Loading…</div>
				<div v-else-if="!tokens?.length" class="token-empty">No tokens yet. Create one to start ingesting events.</div>
				<div v-else class="token-list">
					<div v-for="token in tokens" :key="token.id" class="token-row">
						<div class="token-info">
							<span class="token-name">{{ token.label || 'Unnamed token' }}</span>
							<span v-if="token.revoked" class="revoked-badge">Revoked</span>
							<span class="token-meta">
								Created {{ new Date(token.createdAt).toLocaleDateString() }}
								<template v-if="token.lastUsedAt"> · last used {{ new Date(token.lastUsedAt).toLocaleString() }}</template>
								<template v-else> · never used</template>
							</span>
						</div>
						<button v-if="!token.revoked" class="btn-ghost-sm" @click="revokeToken(token.id)">
							<Trash2 :size="13" :stroke-width="1.7" />
							Revoke
						</button>
					</div>
				</div>
			</div>

			<!-- Danger zone -->
			<div class="card danger-card">
				<div class="card-hd">
					<h3 class="danger-title">Danger zone</h3>
					<p>Permanently delete this project and all associated data.</p>
				</div>
				<button class="btn-danger" :disabled="deleting" @click="deleteProject">
					<Trash2 :size="13" :stroke-width="1.7" />
					{{ deleting ? 'Deleting…' : 'Delete project' }}
				</button>
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

.settings-wrap {
	display: flex;
	flex-direction: column;
	gap: 18px;
	max-width: 640px;
}

.card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	overflow: hidden;
}
.danger-card { border-color: color-mix(in oklab, var(--err) 40%, var(--line)); }

.card-hd {
	padding: 18px 18px 14px;
	border-bottom: 1px solid var(--line);
}
.card-hd h3 { margin: 0 0 3px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.card-hd p  { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }
.danger-title { color: var(--err); }

/* info rows */
.info-rows { display: flex; flex-direction: column; }
.info-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 11px 18px;
	border-bottom: 1px solid var(--line);
	gap: 12px;
}
.info-row:last-child { border-bottom: 0; }
.il { font: 400 12.5px var(--font-sans); color: var(--dim); }
.iv { font: 500 12.5px var(--font-sans); color: var(--fg-hi); }
.mono { font-family: var(--font-mono); font-size: 12px; }
.type-badge {
	font: 500 11px var(--font-mono);
	padding: 2px 7px;
	background: var(--bg-3);
	border: 1px solid var(--line);
	border-radius: 4px;
	color: var(--dim);
	text-transform: capitalize;
}
.copy-row {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: transparent;
	border: none;
	cursor: pointer;
	color: var(--dim);
}
.copy-row:hover { color: var(--fg-hi); }
.small { font-size: 11px; }

/* token form */
.token-form {
	display: flex;
	gap: 10px;
	align-items: flex-end;
	padding: 16px 18px;
	border-bottom: 1px solid var(--line);
}
.field { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.flbl { font: 500 12px var(--font-sans); color: var(--dim); }
.opt  { font-weight: 400; color: var(--mute); }
.inp {
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 8px 12px;
	font: 400 13px var(--font-sans);
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
	white-space: nowrap;
}
.btn-primary:hover { box-shadow: 0 0 0 3px var(--brand-soft); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* dsn reveal */
.dsn-reveal {
	margin: 14px 18px;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 14px;
}
.dsn-label { margin: 0 0 10px; font: 500 12.5px var(--font-sans); color: var(--fg-hi); }
.dsn-row { display: flex; align-items: center; gap: 8px; }
.dsn-code {
	flex: 1;
	font: 400 11px var(--font-mono);
	color: var(--brand);
	background: var(--bg-0);
	border: 1px solid var(--line);
	border-radius: 6px;
	padding: 8px 10px;
	word-break: break-all;
	white-space: pre-wrap;
}
.icon-btn {
	display: inline-grid;
	place-items: center;
	width: 32px; height: 32px;
	border-radius: 7px;
	border: 1px solid var(--line);
	background: var(--bg-1);
	color: var(--dim);
	cursor: pointer;
	flex-shrink: 0;
}
.icon-btn:hover { background: var(--bg-3); color: var(--fg-hi); }

/* token list */
.token-loading, .token-empty {
	padding: 18px;
	font: 400 13px var(--font-sans);
	color: var(--mute);
}
.token-list { border-top: 1px solid var(--line); }
.token-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 18px;
	border-bottom: 1px solid var(--line);
}
.token-row:last-child { border-bottom: 0; }
.token-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.token-name { font: 500 13px var(--font-sans); color: var(--fg-hi); }
.revoked-badge {
	display: inline-block;
	font: 500 10px var(--font-mono);
	padding: 1px 5px;
	border-radius: 4px;
	background: color-mix(in oklab, var(--err) 20%, transparent);
	color: var(--err);
	border: 1px solid color-mix(in oklab, var(--err) 40%, transparent);
}
.token-meta { font: 400 11.5px var(--font-mono); color: var(--mute); }
.btn-ghost-sm {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 5px 10px;
	font: 500 12px var(--font-sans);
	background: transparent;
	border: 1px solid var(--line);
	border-radius: 7px;
	color: var(--dim);
	cursor: pointer;
	white-space: nowrap;
}
.btn-ghost-sm:hover { color: var(--err); border-color: color-mix(in oklab, var(--err) 40%, var(--line)); }

/* danger */
.btn-danger {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin: 16px 18px;
	padding: 8px 14px;
	font: 500 12.5px var(--font-sans);
	background: color-mix(in oklab, var(--err) 15%, transparent);
	border: 1px solid color-mix(in oklab, var(--err) 50%, transparent);
	border-radius: 8px;
	color: var(--err);
	cursor: pointer;
}
.btn-danger:hover { background: color-mix(in oklab, var(--err) 25%, transparent); }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.px-4 { padding-left: 1rem; padding-right: 1rem; }
@media (min-width: 1024px) { .lg\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } }
</style>
