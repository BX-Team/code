<script setup lang="ts">
import { Navbar, Footer } from '@bx-team/ui'
</script>

<template>
	<div class="shell">
		<Navbar />
		<slot />
		<Footer />
	</div>
</template>

<style scoped>
.shell {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}
</style>
