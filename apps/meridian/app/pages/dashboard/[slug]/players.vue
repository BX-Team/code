<script setup lang="ts">
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue'
import SectionCards from '@/components/dashboard/SectionCards.vue'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
useHead({ title: 'Players', titleTemplate: '%s | Pulsify' })

interface PlayerSession {
	player_uuid: string
	joined_at: string
	client_version: string
	country_code: string
}
interface PlayersResponse {
	sessions: PlayerSession[]
	summary: { uniquePlayers: number; newPlayers: number }
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: projects } = await useProjects()
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null)

const { data, pending } = await useAsyncData<PlayersResponse | null>(
	`project-players-page-${slug.value}`,
	() =>
		project.value
			? $fetch<PlayersResponse>(`/api/v3/projects/${project.value.id}/players`)
			: Promise.resolve(null),
)

const stats = computed(() => [
	{
		label: 'Unique players (24h)',
		value: (data.value?.summary.uniquePlayers ?? 0).toLocaleString(),
		hint: 'Distinct UUIDs joined in the last 24 hours',
	},
	{
		label: 'New players (24h)',
		value: (data.value?.summary.newPlayers ?? 0).toLocaleString(),
		hint: 'Never seen on this server before',
	},
])

function relativeTime(iso: string) {
	const diff = Date.now() - new Date(iso).getTime()
	const m = Math.floor(diff / 60000)
	if (m < 1) return 'just now'
	if (m < 60) return `${m}m ago`
	const h = Math.floor(m / 60)
	if (h < 24) return `${h}h ago`
	return `${Math.floor(h / 24)}d ago`
}
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="not-found">Project not found.</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />
		<SectionCards :stats="stats" :loading="pending" />

		<div class="px-4 lg:px-6">
			<div class="card">
				<div class="card-hd">
					<div>
						<h3>Recent sessions</h3>
						<p>Last 24h · up to 100 most recent</p>
					</div>
				</div>
				<div class="tbl-wrap">
					<table class="tbl">
						<thead>
							<tr>
								<th>Player UUID</th>
								<th>Client</th>
								<th>Country</th>
								<th>Joined</th>
							</tr>
						</thead>
						<tbody>
							<template v-if="pending">
								<tr v-for="n in 8" :key="n">
									<td><span class="sk" style="width:280px" /></td>
									<td><span class="sk" style="width:60px" /></td>
									<td><span class="sk" style="width:40px" /></td>
									<td><span class="sk" style="width:80px" /></td>
								</tr>
							</template>
							<tr v-else-if="!data?.sessions.length">
								<td colspan="4" class="empty">No player sessions in the last 24 hours.</td>
							</tr>
							<tr v-for="s in data?.sessions ?? []" :key="s.player_uuid + s.joined_at">
								<td class="uuid-cell">{{ s.player_uuid }}</td>
								<td class="mono-cell">{{ s.client_version || '—' }}</td>
								<td class="mono-cell uppercase">{{ s.country_code || '—' }}</td>
								<td class="mono-cell">{{ relativeTime(s.joined_at) }}</td>
							</tr>
						</tbody>
					</table>
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

.card {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 12px;
	overflow: hidden;
}
.card-hd {
	padding: 18px 18px 0;
}
.card-hd h3 { margin: 0 0 2px; font: 600 14.5px var(--font-sans); color: var(--fg-hi); }
.card-hd p  { margin: 0; font: 400 12.5px var(--font-sans); color: var(--mute); }

.tbl-wrap { overflow-x: auto; margin-top: 14px; border-top: 1px solid var(--line); }

.tbl { width: 100%; border-collapse: collapse; }
.tbl thead th {
	text-align: left;
	padding: 10px 14px;
	font: 500 11px var(--font-mono);
	color: var(--mute);
	text-transform: uppercase;
	letter-spacing: .06em;
	border-bottom: 1px solid var(--line);
	white-space: nowrap;
}
.tbl tbody td {
	padding: 12px 14px;
	border-bottom: 1px solid var(--line);
	font: 400 13px var(--font-sans);
	color: var(--fg);
	vertical-align: middle;
}
.tbl tbody tr:last-child td { border-bottom: 0; }
.tbl tbody tr:hover { background: var(--bg-2); }

.uuid-cell { font: 400 11.5px var(--font-mono); color: var(--dim); }
.mono-cell { font: 500 12px var(--font-mono); color: var(--dim); }
.uppercase { text-transform: uppercase; }

.sk {
	display: block;
	height: 14px;
	border-radius: 4px;
	background: var(--bg-3);
	animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }

.empty {
	text-align: center;
	padding: 48px 14px;
	color: var(--mute);
	font: 400 13px var(--font-sans);
}

.px-4 { padding-left: 1rem; padding-right: 1rem; }
@media (min-width: 1024px) { .lg\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } }
</style>
