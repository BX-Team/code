<script setup lang="ts">
import { LogOut, Save } from '@lucide/vue';
import { authClient } from '@/lib/auth-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

definePageMeta({ layout: 'dashboard', middleware: 'auth' });

const { data: session, refresh } = await useSession();
const user = computed(() => session.value?.user ?? null);

const initials = computed(() => {
	const name = user.value?.name ?? user.value?.email ?? '?';
	return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
});

const displayName = ref('');
watch(user, val => { displayName.value = val?.name ?? '' }, { immediate: true });

const saving = ref(false);
const saveError = ref('');
const saveSuccess = ref(false);

async function saveName() {
	if (saving.value) return;
	saving.value = true;
	saveError.value = '';
	saveSuccess.value = false;
	try {
		await authClient.updateUser({ name: displayName.value });
		await refresh();
		saveSuccess.value = true;
		setTimeout(() => { saveSuccess.value = false }, 3000);
	} catch (err: any) {
		saveError.value = err?.message ?? 'Failed to save';
	} finally {
		saving.value = false;
	}
}

const deletingAccount = ref(false);
const deleteError = ref('');

async function deleteAccount() {
	if (!confirm('Delete your account permanently? This cannot be undone.')) return;
	deletingAccount.value = true;
	deleteError.value = '';
	try {
		await authClient.deleteUser();
		await navigateTo('/');
	} catch (err: any) {
		deleteError.value = err?.message ?? 'Failed to delete account';
		deletingAccount.value = false;
	}
}

async function logout() {
	await authClient.signOut();
	await navigateTo('/login');
}
</script>

<template>
	<div class="px-4 lg:px-6 flex flex-col gap-6 max-w-2xl">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Account settings</h1>
			<p class="text-muted-foreground text-sm mt-1">Manage your profile and account preferences.</p>
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Profile</CardTitle>
				<CardDescription>Your public profile information.</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-5">
				<div class="flex items-center gap-4">
					<Avatar class="h-14 w-14 rounded-xl">
						<AvatarImage v-if="user?.image" :src="user.image" :alt="user?.name ?? ''" />
						<AvatarFallback class="rounded-xl text-lg">{{ initials }}</AvatarFallback>
					</Avatar>
					<div class="flex flex-col gap-0.5">
						<span class="font-medium">{{ user?.name ?? 'Unknown' }}</span>
						<span class="text-sm text-muted-foreground">{{ user?.email }}</span>
					</div>
				</div>
				<div class="grid gap-2">
					<Label for="display-name">Display name</Label>
					<Input id="display-name" v-model="displayName" maxlength="64" placeholder="Your name" />
				</div>
				<Alert v-if="saveError" variant="destructive">
					<AlertDescription>{{ saveError }}</AlertDescription>
				</Alert>
				<Alert v-if="saveSuccess">
					<AlertDescription>Profile saved.</AlertDescription>
				</Alert>
				<div>
					<Button :disabled="saving" @click="saveName">
						<Save class="size-4" />
						{{ saving ? 'Saving…' : 'Save changes' }}
					</Button>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Session</CardTitle>
				<CardDescription>Manage your current session.</CardDescription>
			</CardHeader>
			<CardContent>
				<Button variant="outline" @click="logout">
					<LogOut class="size-4" />
					Sign out
				</Button>
			</CardContent>
		</Card>

		<Card class="border-destructive/50">
			<CardHeader>
				<CardTitle class="text-destructive">Danger zone</CardTitle>
				<CardDescription>Irreversible actions for your account.</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-4">
				<p class="text-sm text-muted-foreground">
					Deleting your account will permanently remove all your projects, tokens, and data.
				</p>
				<Alert v-if="deleteError" variant="destructive">
					<AlertDescription>{{ deleteError }}</AlertDescription>
				</Alert>
				<div>
					<Button variant="destructive" :disabled="deletingAccount" @click="deleteAccount">
						{{ deletingAccount ? 'Deleting…' : 'Delete account' }}
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>
</template>
