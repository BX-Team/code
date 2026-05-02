<script setup lang="ts">
import { Copy, Plus, Trash2 } from '@lucide/vue';
import ProjectTabs from '@/components/dashboard/ProjectTabs.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });

interface DsnToken {
  id: string;
  label: string | null;
  revoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: projects } = await useProjects();
const project = computed(() => (projects.value ?? []).find(p => p.slug === slug.value) ?? null);

const {
  data: tokens,
  refresh: refreshTokens,
  pending,
} = await useAsyncData<DsnToken[]>(`project-tokens-${slug.value}`, () =>
  project.value ? $fetch<DsnToken[]>(`/api/v3/projects/${project.value.id}/tokens`) : Promise.resolve([]),
);

const newLabel = ref('');
const justCreated = ref<{ key: string; label: string | null } | null>(null);
const error = ref('');
const creating = ref(false);

const ingestHost = computed(() => {
  if (typeof window === 'undefined') return 'ingest.bxteam.org';
  const url = new URL(window.location.origin);
  return `ingest.${url.hostname.replace(/^www\./, '')}`;
});

const dsnPreview = computed(() => {
  if (!justCreated.value || !project.value) return '';
  return `https://${justCreated.value.key}@${ingestHost.value}/api/v1/${project.value.id}`;
});

async function createToken() {
  if (creating.value || !project.value) return;
  creating.value = true;
  error.value = '';
  try {
    const result = await $fetch<{ id: string; key: string; label: string | null; createdAt: string }>(
      `/api/v3/projects/${project.value.id}/tokens`,
      { method: 'POST', body: { label: newLabel.value || undefined } },
    );
    justCreated.value = { key: result.key, label: result.label };
    newLabel.value = '';
    await refreshTokens();
  } catch (err: any) {
    error.value = err?.data?.message ?? err?.message ?? 'Failed to create token';
  } finally {
    creating.value = false;
  }
}

async function revokeToken(tokenId: string) {
  if (!project.value) return;
  if (!confirm('Revoke this token? Servers using it will stop being able to send events.')) return;
  try {
    await $fetch(`/api/v3/projects/${project.value.id}/tokens/${tokenId}`, { method: 'DELETE' });
    await refreshTokens();
  } catch (err: any) {
    error.value = err?.data?.message ?? err?.message ?? 'Failed to revoke token';
  }
}

function copy(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

const deleting = ref(false);
const deleteError = ref('');

async function deleteProject() {
  if (!project.value) return;
  if (!confirm(`Delete project "${project.value.name}"? This cannot be undone.`)) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await $fetch(`/api/v3/projects/${project.value.id}`, { method: 'DELETE' });
    await refreshNuxtData('v3-projects');
    await refreshNuxtData('v3-overview');
    await navigateTo('/dashboard');
  } catch (err: any) {
    deleteError.value = err?.data?.message ?? err?.message ?? 'Failed to delete project';
    deleting.value = false;
  }
}
</script>

<template>
	<div v-if="!project" class="px-4 lg:px-6">
		<div class="border rounded-lg p-12 text-center text-muted-foreground">
			Project not found.
		</div>
	</div>
	<template v-else>
		<ProjectTabs :slug="project.slug" :project-type="project.type" />

		<div class="px-4 lg:px-6 flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Project</CardTitle>
					<CardDescription>
						Identifying details for this Pulsify workspace.
					</CardDescription>
				</CardHeader>
				<CardContent class="grid gap-3 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Name</span>
						<span class="font-medium">{{ project.name }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Slug</span>
						<span class="font-mono">{{ project.slug }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Type</span>
						<Badge variant="outline" class="capitalize">{{ project.type }}</Badge>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Project ID</span>
						<button
							class="font-mono text-xs flex items-center gap-1.5 hover:text-foreground"
							@click="copy(project.id)"
						>
							{{ project.id }}
							<Copy class="size-3" />
						</button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>DSN tokens</CardTitle>
					<CardDescription>
						Each Pulsify SDK uses a token to authenticate. You can rotate or revoke them at any time.
					</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-4">
					<form class="flex items-end gap-2" @submit.prevent="createToken">
						<div class="flex-1 grid gap-2">
							<Label for="token-label">New token label (optional)</Label>
							<Input
								id="token-label"
								v-model="newLabel"
								placeholder="production / staging / dev-laptop"
								maxlength="64"
							/>
						</div>
						<Button type="submit" :disabled="creating">
							<Plus class="size-4" />
							{{ creating ? 'Creating…' : 'Create token' }}
						</Button>
					</form>

					<Alert v-if="error" variant="destructive">
						<AlertDescription>{{ error }}</AlertDescription>
					</Alert>

					<div v-if="justCreated" class="border rounded-md p-4 bg-muted/40 flex flex-col gap-2">
						<p class="text-sm font-medium">
							New token created — copy it now, you will not see it again.
						</p>
						<div class="flex items-center gap-2">
							<code class="flex-1 break-all font-mono text-xs p-2 bg-background border rounded">{{ dsnPreview }}</code>
							<Button size="sm" variant="outline" @click="copy(dsnPreview)">
								<Copy class="size-3" />
							</Button>
						</div>
					</div>

					<div v-if="pending && !tokens?.length" class="text-sm text-muted-foreground">
						Loading…
					</div>
					<div v-else-if="!tokens?.length" class="text-sm text-muted-foreground">
						No tokens yet. Create one to start ingesting events.
					</div>
					<ul v-else class="flex flex-col divide-y border rounded-md">
						<li
							v-for="token in tokens"
							:key="token.id"
							class="flex items-center justify-between p-3 gap-2"
						>
							<div class="flex flex-col gap-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="font-medium truncate">{{ token.label || 'Unnamed token' }}</span>
									<Badge v-if="token.revoked" variant="destructive">Revoked</Badge>
								</div>
								<span class="text-xs text-muted-foreground">
									Created {{ new Date(token.createdAt).toLocaleDateString() }}
									<template v-if="token.lastUsedAt">
										· last used {{ new Date(token.lastUsedAt).toLocaleString() }}
									</template>
									<template v-else>
										· never used
									</template>
								</span>
							</div>
							<Button
								v-if="!token.revoked"
								variant="ghost"
								size="sm"
								@click="revokeToken(token.id)"
							>
								<Trash2 class="size-4" />
								Revoke
							</Button>
						</li>
					</ul>
				</CardContent>
			</Card>

			<Card class="border-destructive/50">
				<CardHeader>
					<CardTitle class="text-destructive">Danger zone</CardTitle>
					<CardDescription>Permanently delete this project and all associated data.</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-col gap-4">
					<Alert v-if="deleteError" variant="destructive">
						<AlertDescription>{{ deleteError }}</AlertDescription>
					</Alert>
					<div>
						<Button variant="destructive" :disabled="deleting" @click="deleteProject">
							<Trash2 class="size-4" />
							{{ deleting ? 'Deleting…' : 'Delete project' }}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	</template>
</template>
