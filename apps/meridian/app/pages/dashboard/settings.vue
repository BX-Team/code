<script setup lang="ts">
import { LogOut, Save, Trash2 } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });
useHead({ title: 'Settings', titleTemplate: '%s | Pulsify' });

type SettingsTab = 'account' | 'billing';
const activeTab = ref<SettingsTab>('account');

interface BillingResponse {
  plan: string;
  limits: { maxProjects: number; maxEventsPerDay: number };
  usage: { projects: number; eventsToday: number };
}
const { data: billing, pending: billingPending } = await useAsyncData<BillingResponse | null>('billing', () =>
  api<BillingResponse>('/pulsify/billing').catch(() => null),
);

const { data: session, refresh } = await useSession();
const user = computed(() => session.value?.user ?? null);
const { openConfirm } = useConfirmDialog();

const initials = computed(() => {
  const name = user.value?.name ?? user.value?.email ?? '?';
  return name
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
});

const displayName = ref('');
watch(
  user,
  val => {
    displayName.value = val?.name ?? '';
  },
  { immediate: true },
);

const saving = ref(false);

async function saveName() {
  if (saving.value) return;
  saving.value = true;
  try {
    await authClient.updateUser({ name: displayName.value });
    await refresh();
    toast.success('Profile saved');
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to save');
  } finally {
    saving.value = false;
  }
}

async function logout() {
  await authClient.signOut();
  await navigateTo('/login');
}

const deletingAccount = ref(false);

async function deleteAccount() {
  const confirmed = await openConfirm({
    title: 'Delete account?',
    message: 'This will permanently remove all your projects, tokens, and data. This cannot be undone.',
    danger: true,
    confirmText: 'Delete account',
  });
  if (!confirmed) return;
  deletingAccount.value = true;
  try {
    await authClient.deleteUser();
    window.location.href = '/';
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to delete account');
    deletingAccount.value = false;
  }
}
</script>

<template>
	<div class="settings-wrap px-4 lg:px-6">
		<div class="tab-bar">
			<button class="tab" :class="{ active: activeTab === 'account' }" @click="activeTab = 'account'">Account</button>
			<button class="tab" :class="{ active: activeTab === 'billing' }" @click="activeTab = 'billing'">Billing</button>
		</div>
		<template v-if="activeTab === 'account'">
		<div class="page-title">
			<h2>Account settings</h2>
			<p>Manage your profile and account preferences.</p>
		</div>

		<div class="card">
			<div class="card-hd">
				<h3>Profile</h3>
				<p>Your public profile information.</p>
			</div>

			<div class="profile-content">
				<div class="avatar-row">
					<div class="avatar">{{ initials }}</div>
					<div>
						<div class="uname">{{ user?.name ?? 'Unknown' }}</div>
						<div class="uemail">{{ user?.email }}</div>
					</div>
				</div>

				<div class="field">
					<label class="flbl" for="display-name">Display name</label>
					<input id="display-name" v-model="displayName" class="inp" maxlength="64" placeholder="Your name" />
				</div>

				<button class="btn-primary" :disabled="saving" @click="saveName">
					<Save :size="13" :stroke-width="1.7" />
					{{ saving ? 'Saving…' : 'Save changes' }}
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-hd">
				<h3>Session</h3>
				<p>Manage your current session.</p>
			</div>
			<div class="session-content">
				<button class="btn-ghost" @click="logout">
					<LogOut :size="13" :stroke-width="1.7" />
					Sign out
				</button>
			</div>
		</div>

		<div class="card danger-card">
			<div class="card-hd">
				<h3 class="danger-title">Danger zone</h3>
				<p>Irreversible actions for your account.</p>
			</div>
			<div class="danger-content">
				<p class="danger-desc">Deleting your account will permanently remove all your projects, tokens, and data.</p>
				<button class="btn-danger" :disabled="deletingAccount" @click="deleteAccount">
					<Trash2 :size="13" :stroke-width="1.7" />
					{{ deletingAccount ? 'Deleting…' : 'Delete account' }}
				</button>
			</div>
		</div>
		</template>
		<div v-if="activeTab === 'billing'" class="billing-section">
			<div class="page-title">
				<h2>Billing</h2>
				<p>Your plan and usage limits.</p>
			</div>

			<div class="card">
				<div class="card-hd">
					<h3>Current plan</h3>
					<p>You are on the free plan.</p>
				</div>
				<div class="plan-content">
					<div class="plan-badge free">Free</div>
					<p class="plan-desc">The free plan includes all features with the limits below. Paid plans coming soon.</p>
				</div>
			</div>

			<div class="card">
				<div class="card-hd">
					<h3>Usage</h3>
					<p>Your current usage for this period.</p>
				</div>
				<div v-if="billingPending" class="usage-loading">Loading…</div>
				<div v-else class="usage-rows">
					<div class="usage-row">
						<div class="usage-info">
							<span class="usage-label">Projects</span>
							<span class="usage-count">{{ billing?.usage.projects ?? 0 }} / {{ billing?.limits.maxProjects ?? 10 }}</span>
						</div>
						<div class="usage-bar">
							<div
								class="usage-fill"
								:style="{ width: Math.min(100, ((billing?.usage.projects ?? 0) / (billing?.limits.maxProjects ?? 10)) * 100) + '%' }"
							/>
						</div>
					</div>
					<div class="usage-row">
						<div class="usage-info">
							<span class="usage-label">Events today</span>
							<span class="usage-count">{{ (billing?.usage.eventsToday ?? 0).toLocaleString() }} / {{ (billing?.limits.maxEventsPerDay ?? 100000).toLocaleString() }}</span>
						</div>
						<div class="usage-bar">
							<div
								class="usage-fill"
								:style="{ width: Math.min(100, ((billing?.usage.eventsToday ?? 0) / (billing?.limits.maxEventsPerDay ?? 100000)) * 100) + '%' }"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.settings-wrap {
	display: flex;
	flex-direction: column;
	gap: 18px;
	max-width: 640px;
}

.page-title { margin-bottom: 4px; }
.page-title h2 { margin: 0; font: 600 20px var(--font-sans); color: var(--fg-hi); letter-spacing: -0.01em; }
.page-title p  { margin: 4px 0 0; font: 400 13px var(--font-sans); color: var(--mute); }

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

.profile-content, .session-content, .danger-content {
	padding: 18px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.avatar-row { display: flex; align-items: center; gap: 14px; }
.avatar {
	width: 48px; height: 48px; border-radius: 12px;
	background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);
	display: grid; place-items: center;
	font: 700 16px var(--font-sans);
	color: var(--bg-0);
	flex-shrink: 0;
}
.uname  { font: 600 14px var(--font-sans); color: var(--fg-hi); }
.uemail { font: 400 12.5px var(--font-sans); color: var(--mute); margin-top: 2px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.flbl  { font: 500 12.5px var(--font-sans); color: var(--dim); }
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
}
.btn-primary:hover { box-shadow: 0 0 0 3px var(--brand-soft); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-ghost {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	font: 500 12.5px var(--font-sans);
	background: transparent;
	border: 1px solid var(--line);
	border-radius: 8px;
	color: var(--dim);
	cursor: pointer;
}
.btn-ghost:hover { color: var(--fg-hi); border-color: var(--line-2); }

.danger-desc { margin: 0; font: 400 13px var(--font-sans); color: var(--mute); }
.btn-danger {
	display: inline-flex;
	align-items: center;
	gap: 6px;
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

.tab-bar {
	display: flex;
	gap: 0;
	border-bottom: 1px solid var(--line);
	margin-bottom: 18px;
}
.tab {
	padding: 10px 16px;
	font: 500 13.5px var(--font-sans);
	color: var(--dim);
	cursor: pointer;
	border: none;
	background: transparent;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
}
.tab.active { color: var(--fg-hi); border-bottom-color: var(--brand); }
.tab:hover { color: var(--fg-hi); }

.billing-section { display: flex; flex-direction: column; gap: 18px; }

.plan-content { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.plan-badge {
	display: inline-flex;
	align-items: center;
	padding: 4px 12px;
	border-radius: 99px;
	font: 600 12px var(--font-sans);
	text-transform: uppercase;
	letter-spacing: .06em;
	width: fit-content;
}
.plan-badge.free {
	background: var(--bg-3);
	color: var(--dim);
	border: 1px solid var(--line);
}
.plan-desc { margin: 0; font: 400 13px var(--font-sans); color: var(--mute); }

.usage-loading { padding: 18px; font: 400 13px var(--font-sans); color: var(--mute); }
.usage-rows { display: flex; flex-direction: column; }
.usage-row {
	padding: 14px 18px;
	border-bottom: 1px solid var(--line);
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.usage-row:last-child { border-bottom: 0; }
.usage-info {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.usage-label { font: 500 13px var(--font-sans); color: var(--fg-hi); }
.usage-count { font: 400 12px var(--font-mono); color: var(--mute); }
.usage-bar {
	height: 6px;
	background: var(--bg-3);
	border-radius: 3px;
	overflow: hidden;
}
.usage-fill {
	height: 100%;
	background: var(--brand);
	border-radius: 3px;
	transition: width 0.3s ease;
}
</style>
