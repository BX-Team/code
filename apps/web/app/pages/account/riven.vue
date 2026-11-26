<script setup lang="ts">
useHead({ title: 'Riven Launcher' });
</script>

<template>
	<h1 class="sr-only">Riven Launcher</h1>
	<AccountSkinSection />
	<AccountFriendsSection />
	<AccountDisconnectSection client-id="riven" />
</template>
