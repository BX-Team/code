<script setup lang="ts">
import { LogOut, Save, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { authClient } from '@/lib/auth-client'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { data: session, refresh } = await useSession()
const user = computed(() => session.value?.user ?? null)
const { openConfirm } = useConfirmDialog()

const initials = computed(() => {
	const name = user.value?.name ?? user.value?.email ?? '?'
	return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
})

const displayName = ref('')
watch(user, val => { displayName.value = val?.name ?? '' }, { immediate: true })

const saving = ref(false)

async function saveName() {
	if (saving.value) return
	saving.value = true
	try {
		await authClient.updateUser({ name: displayName.value })
		await refresh()
		toast.success('Profile saved')
	} catch (err: any) {
		toast.error(err?.message ?? 'Failed to save')
	} finally {
		saving.value = false
	}
}

async function logout() {
	await authClient.signOut()
	await navigateTo('/login')
}

const deletingAccount = ref(false)

async function deleteAccount() {
	const confirmed = await openConfirm({
		title: 'Delete account?',
		message: 'This will permanently remove all your projects, tokens, and data. This cannot be undone.',
		danger: true,
		confirmText: 'Delete account',
	})
	if (!confirmed) return
	deletingAccount.value = true
	try {
		await authClient.deleteUser()
		await navigateTo('/')
	} catch (err: any) {
		toast.error(err?.message ?? 'Failed to delete account')
		deletingAccount.value = false
	}
}
</script>

<template>
	<div class="settings-wrap px-4 lg:px-6">
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
</style>
