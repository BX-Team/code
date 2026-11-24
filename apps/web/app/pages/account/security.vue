<script setup lang="ts">
import { auth } from '~/lib/auth';

useHead({ title: 'Account & security' });

const session = auth.useSession();
</script>

<template>
	<h1 class="sr-only">Account &amp; security</h1>
	<div class="sec">
		<AccountProfileSection />
		<AccountMethodsSection :email="session.data?.user.email ?? ''" />
		<AccountDevicesSection :current="session.data?.session.id ?? ''" />
		<AccountActivitySection />
	</div>
	<AccountDeleteSection />
</template>

<style scoped>
.sec {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
	gap: var(--s-5);
	align-items: stretch;
}
</style>
