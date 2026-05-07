<script setup lang="ts">
const { state, answer } = useConfirmDialog();

function onKeydown(e: KeyboardEvent) {
  if (!state.open) return;
  if (e.key === 'Escape') answer(false);
  if (e.key === 'Enter') answer(true);
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
	<Teleport to="body">
		<Transition name="overlay">
			<div v-if="state.open" class="overlay" @click.self="answer(false)">
				<div class="dialog" role="alertdialog" aria-modal="true">
					<p class="title">{{ state.options.title }}</p>
					<p v-if="state.options.message" class="message">{{ state.options.message }}</p>
					<div class="actions">
						<button class="btn-cancel" @click="answer(false)">
							{{ state.options.cancelText ?? 'Cancel' }}
						</button>
						<button
							class="btn-confirm"
							:class="{ danger: state.options.danger }"
							@click="answer(true)"
						>
							{{ state.options.confirmText ?? 'Confirm' }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, .55);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 200;
	backdrop-filter: blur(3px);
}

.dialog {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 14px;
	padding: 24px;
	width: 380px;
	max-width: calc(100vw - 32px);
	box-shadow: 0 24px 64px rgba(0, 0, 0, .5);
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.title {
	margin: 0;
	font: 600 15px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
}

.message {
	margin: 0;
	font: 400 13px var(--font-sans);
	color: var(--mute);
	line-height: 1.55;
}

.actions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
	margin-top: 6px;
}

.btn-cancel {
	padding: 8px 16px;
	font: 500 13px var(--font-sans);
	background: transparent;
	border: 1px solid var(--line);
	border-radius: 8px;
	color: var(--dim);
	cursor: pointer;
}
.btn-cancel:hover { color: var(--fg-hi); border-color: var(--line-2); }

.btn-confirm {
	padding: 8px 16px;
	font: 500 13px var(--font-sans);
	background: var(--brand);
	border: 1px solid var(--brand);
	border-radius: 8px;
	color: var(--bg-0);
	cursor: pointer;
}
.btn-confirm:hover { box-shadow: 0 0 0 3px var(--brand-soft); }
.btn-confirm.danger {
	background: color-mix(in oklab, var(--err) 20%, transparent);
	border-color: color-mix(in oklab, var(--err) 50%, transparent);
	color: var(--err);
}
.btn-confirm.danger:hover {
	background: color-mix(in oklab, var(--err) 30%, transparent);
	box-shadow: none;
}

.overlay-enter-active, .overlay-leave-active { transition: opacity .18s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.overlay-enter-active .dialog { transition: transform .18s ease; }
.overlay-enter-from .dialog { transform: scale(.97) translateY(6px); }
</style>
