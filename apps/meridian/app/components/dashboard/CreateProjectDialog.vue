<script setup lang="ts">
import { X } from '@lucide/vue';
import { api } from '@/lib/api';

const open = useCreateProjectDialog();

const name = ref('');
const slug = ref('');
const type = ref<'server' | 'plugin' | 'mod'>('server');
const description = ref('');
const submitting = ref(false);
const error = ref('');
const slugEdited = ref(false);

watch(name, val => {
  if (!slugEdited.value) {
    slug.value = val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
});

function onSlugInput() {
  slugEdited.value = true;
  slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

async function submit() {
  if (!name.value.trim()) {
    error.value = 'Name is required';
    return;
  }
  if (!slug.value.trim()) {
    error.value = 'Slug is required';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    const created = await api<{ slug: string }>('/pulsify/projects', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        slug: slug.value.trim(),
        type: type.value,
        description: description.value.trim() || undefined,
      },
    });
    const createdSlug = created.slug;
    name.value = '';
    slug.value = '';
    slugEdited.value = false;
    type.value = 'server';
    description.value = '';
    open.value = false;
    await refreshNuxtData('v3-projects');
    await refreshNuxtData('v3-overview');
    await navigateTo(`/dashboard/${createdSlug}`);
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Something went wrong';
  } finally {
    submitting.value = false;
  }
}

function close() {
  open.value = false;
  error.value = '';
}
</script>

<template>
	<Teleport to="body">
		<Transition name="overlay">
			<div v-if="open" class="overlay" @click.self="close">
				<div class="dialog" role="dialog" aria-modal="true">
					<div class="dialog-hd">
						<h2>New project</h2>
						<button class="close-btn" @click="close">
							<X :size="16" :stroke-width="1.7" />
						</button>
					</div>

					<form class="dialog-body" @submit.prevent="submit">
						<div class="field">
							<label class="lbl">Project name</label>
							<input v-model="name" class="inp" placeholder="e.g. My Server" autocomplete="off" />
						</div>

						<div class="field">
							<label class="lbl">
								Slug
								<span class="lbl-hint">a-z, 0-9, hyphens only</span>
							</label>
							<input
								v-model="slug"
								class="inp mono"
								placeholder="my-server"
								autocomplete="off"
								@input="onSlugInput"
							/>
						</div>

						<div class="field">
							<label class="lbl">Type</label>
							<div class="type-tabs">
								<button
									v-for="t in ['server', 'plugin', 'mod']"
									:key="t"
									type="button"
									class="type-tab"
									:class="{ active: type === t }"
									@click="type = t as any"
								>{{ t }}</button>
							</div>
						</div>

						<div class="field">
							<label class="lbl">Description <span class="opt">(optional)</span></label>
							<input v-model="description" class="inp" placeholder="Short description" />
						</div>

						<p v-if="error" class="err-msg">{{ error }}</p>

						<div class="dialog-foot">
							<button type="button" class="btn-ghost" @click="close">Cancel</button>
							<button type="submit" class="btn-primary" :disabled="submitting">
								{{ submitting ? 'Creating…' : 'Create project' }}
							</button>
						</div>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
	backdrop-filter: blur(4px);
}

.dialog {
	background: var(--bg-1);
	border: 1px solid var(--line);
	border-radius: 14px;
	width: 440px;
	max-width: calc(100vw - 32px);
	box-shadow: 0 24px 64px rgba(0,0,0,.5);
}

.dialog-hd {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 20px 0;
}
.dialog-hd h2 {
	margin: 0;
	font: 600 16px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
}
.close-btn {
	display: inline-grid;
	place-items: center;
	width: 28px; height: 28px;
	border-radius: 6px;
	border: 1px solid transparent;
	background: transparent;
	color: var(--dim);
	cursor: pointer;
}
.close-btn:hover { background: var(--bg-3); color: var(--fg-hi); border-color: var(--line); }

.dialog-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.lbl {
	display: flex;
	align-items: center;
	gap: 8px;
	font: 500 12.5px var(--font-sans);
	color: var(--dim);
}
.lbl-hint {
	font: 400 11.5px var(--font-mono);
	color: var(--mute);
}
.opt { font-weight: 400; color: var(--mute); }

.inp {
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 9px 12px;
	font: 400 13.5px var(--font-sans);
	color: var(--fg-hi);
	outline: none;
	transition: border-color .15s;
	width: 100%;
	box-sizing: border-box;
}
.inp.mono { font-family: var(--font-mono); font-size: 13px; }
.inp::placeholder { color: var(--mute); }
.inp:focus { border-color: var(--brand); }

.type-tabs { display: flex; gap: 6px; }
.type-tab {
	flex: 1;
	padding: 7px;
	font: 500 12.5px var(--font-sans);
	color: var(--dim);
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 8px;
	cursor: pointer;
	text-transform: capitalize;
}
.type-tab.active {
	background: var(--brand-soft);
	color: var(--brand);
	border-color: color-mix(in oklab, var(--brand) 50%, var(--line));
}

.err-msg { margin: 0; font: 400 12.5px var(--font-sans); color: var(--err); }

.dialog-foot {
	display: flex;
	gap: 10px;
	justify-content: flex-end;
	padding-top: 4px;
}
.btn-ghost {
	padding: 8px 16px;
	font: 500 13px var(--font-sans);
	background: transparent;
	border: 1px solid var(--line);
	border-radius: 8px;
	color: var(--dim);
	cursor: pointer;
}
.btn-ghost:hover { color: var(--fg-hi); border-color: var(--line-2); }
.btn-primary {
	padding: 8px 18px;
	font: 500 13px var(--font-sans);
	background: var(--brand);
	border: 1px solid var(--brand);
	border-radius: 8px;
	color: var(--bg-0);
	cursor: pointer;
}
.btn-primary:hover { box-shadow: 0 0 0 3px var(--brand-soft); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.overlay-enter-active, .overlay-leave-active { transition: opacity .2s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
</style>
