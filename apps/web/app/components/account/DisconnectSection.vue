<script setup lang="ts">
import { ref } from 'vue';
import { APPS, disconnectApp } from '~/lib/auth';

/** Disconnects an app and deletes what it kept; asks once more on the same row. */
const props = defineProps<{ clientId: string }>();

const { t } = useI18n();
const notify = useNotify();
const sitePath = useSitePath();
const { refresh } = useAccountData();
const name = APPS[props.clientId]?.name ?? props.clientId;

const asking = ref(false);
const busy = ref(false);

async function disconnect() {
  busy.value = true;
  try {
    await disconnectApp(props.clientId);
    await refresh();
    notify.success(t('account.disconnect.done', { app: name }));
    await navigateTo(sitePath('/account'));
  } catch (error) {
    notify.error(error);
  } finally {
    busy.value = false;
    asking.value = false;
  }
}
</script>

<template>
	<AccountSection id="disconnect" :title="$t('account.disconnect.title', { app: name })">
		<div class="dc">
			<p class="dc__text">{{ $t('account.disconnect.body', { app: name }) }}</p>
			<button v-if="!asking" type="button" class="btn small dc__go" @click="asking = true">
				{{ $t('account.disconnect.go') }}
			</button>
			<div v-else class="dc__ask" role="group">
				<span class="dc__q">{{ $t('account.disconnect.confirm') }}</span>
				<button type="button" class="btn quiet small" :disabled="busy" @click="asking = false">
					{{ $t('account.disconnect.cancel') }}
				</button>
				<button type="button" class="btn small dc__yes" :disabled="busy" @click="disconnect">
					{{ busy ? $t('account.disconnect.busy') : $t('account.disconnect.yes') }}
				</button>
			</div>
		</div>
	</AccountSection>
</template>

<style scoped>
.dc {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--s-3) var(--s-6);
}

.dc__text {
	flex: 1 1 360px;
	margin: 0;
	font: 400 13.5px/1.6 var(--font-sans);
	color: var(--mute);
}

.dc__ask {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.dc__q {
	font: 500 13.5px/1.4 var(--font-sans);
	color: var(--fg-hi);
}

.bxid .dc__go,
.bxid .dc__yes:not(:disabled) {
	color: var(--err);
}

.bxid .dc__yes:not(:disabled) {
	border-color: color-mix(in srgb, var(--err) 55%, var(--line-2));
}
</style>
