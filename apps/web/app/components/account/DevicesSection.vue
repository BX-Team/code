<script setup lang="ts">
import { Plus } from '@lucide/vue';
import { type Component, computed, ref } from 'vue';
import { AGENT_ICONS, describeAgent } from '~/lib/agents';
import { auth } from '~/lib/auth';

const props = defineProps<{ current: string }>();

/** Rows shown before "Show all", so a long list does not stretch the card beside it. */
const FOLDED = 5;

const { t } = useI18n();
const format = useFormat();
const sitePath = useSitePath();
const { sessions, refresh } = useAccountData();
const busy = ref('');
const notify = useNotify();
const open = ref(false);

const sorted = computed(() =>
  [...(sessions.value ?? [])].sort(
    (a, b) => Number(b.id === props.current) - Number(a.id === props.current) || +b.updatedAt - +a.updatedAt,
  ),
);
const shown = computed(() => (open.value ? sorted.value : sorted.value.slice(0, FOLDED)));
const others = computed(() => sorted.value.filter(s => s.id !== props.current).length);

function describe(ua?: string | null): { icon: Component; name: string } {
  const { kind, name } = describeAgent(ua, t);
  return { icon: AGENT_ICONS[kind], name };
}

async function revoke(token: string, id: string) {
  busy.value = id;
  const { error: failed } = await auth.revokeSession({ token });
  if (failed) notify.error(failed);
  await refresh();
  busy.value = '';
}

async function revokeOthers() {
  busy.value = 'others';
  const { error: failed } = await auth.revokeOtherSessions();
  if (failed) notify.error(failed);
  await refresh();
  busy.value = '';
}
</script>

<template>
	<AccountSection
		id="devices"
		:title="sessions ? $t('account.devices.titleCount', { n: sessions.length }) : $t('account.devices.title')"
		:lead="$t('account.devices.lede')"
	>
		<template #actions>
			<div class="acts">
				<NuxtLink :to="sitePath('/account/device')" class="btn small">
					<Plus :size="15" :stroke-width="1.8" /> {{ $t('account.devices.connect') }}
				</NuxtLink>
				<button v-if="others" type="button" class="btn small" :disabled="busy === 'others'" @click="revokeOthers">
					{{ $t('account.devices.signOutOthers') }}
				</button>
			</div>
		</template>

		<ul v-if="shown.length" class="list">
			<li v-for="row in shown" :key="row.id">
				<span class="mark"><component :is="describe(row.userAgent).icon" :size="18" :stroke-width="1.7" /></span>
				<div class="grow">
					<span class="name">{{ describe(row.userAgent).name }}</span>
					<span class="sub">
						{{
							row.id === current
								? $t('account.devices.activeNow')
								: $t('account.devices.lastActive', { when: format.relative(row.updatedAt.toISOString()) })
						}}
						<template v-if="format.place(row.city, row.country) ?? row.ipAddress">
								· <span :title="row.ipAddress ?? undefined">{{ format.place(row.city, row.country) ?? row.ipAddress }}</span>
							</template>
					</span>
				</div>
				<span v-if="row.id === current" class="badge">{{ $t('account.devices.thisDevice') }}</span>
				<div v-else class="actions">
					<button
						type="button"
						class="btn quiet small danger"
						:disabled="busy === row.id"
						@click="revoke(row.token, row.id)"
					>
						{{ $t('account.devices.signOut') }}
						</button>
				</div>
			</li>
		</ul>
		<button v-if="sorted.length > FOLDED" type="button" class="btn quiet small list-more" @click="open = !open">
			{{ open ? $t('account.devices.fewer') : $t('account.devices.all', { n: sorted.length }) }}
		</button>
	</AccountSection>
</template>

<style scoped>
.acts {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.mark {
	display: grid;
	flex: none;
	place-items: center;
	width: 36px;
	height: 36px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	background: var(--surface-card);
	color: var(--fg);
}
</style>
