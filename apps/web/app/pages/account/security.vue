<script setup lang="ts">
import { auth } from '~/lib/auth';

const { t } = useI18n();

useHead({ title: () => t('account.securityTab') });

const session = auth.useSession();
</script>

<template>
	<h1 class="sr-only">{{ $t('account.securityTab') }}</h1>
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
