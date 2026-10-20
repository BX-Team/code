<template>
	<div class="cards-grid">
		<slot />
	</div>
</template>

<style scoped>
.cards-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;
	margin: 22px 0;
}
</style>
