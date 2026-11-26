<script setup lang="ts">
import type { ActivityEvent } from '@bx-team/types/schema/bxid';
import {
  AtSign,
  Image,
  KeyRound,
  LogIn,
  LogOut,
  MonitorX,
  Shirt,
  Sparkles,
  Unlink,
  Unplug,
  UserMinus,
  UserPen,
  UserPlus,
} from '@lucide/vue';
import { type Component, onMounted, ref, watch } from 'vue';
import { AGENT_ICONS, describeAgent } from '~/lib/agents';
import { APPS, auth, fetchActivity, PROVIDER_NAMES } from '~/lib/auth';

const { t } = useI18n();
const format = useFormat();

const events = ref<ActivityEvent[] | null>(null);
const next = ref<string | null>(null);
const busy = ref(false);
const error = ref('');

onMounted(() => load());

async function load(before?: string | null) {
  busy.value = true;
  error.value = '';
  try {
    const page = await fetchActivity(before);
    events.value = before ? [...(events.value ?? []), ...page.events] : page.events;
    next.value = page.next;
  } catch {
    error.value = t('account.activity.failed');
  }
  busy.value = false;
}

// The other cards on this page refresh these after a change, which also lands here as an event.
const session = auth.useSession();
const { links, sessions } = useAccountData();
watch([links, sessions, () => session.value.data?.user.updatedAt?.toString()], (_, before) => {
  if (before.some(Boolean)) load();
});

function describe(event: ActivityEvent): { icon: Component; title: string } {
  const d = event.detail ?? {};
  const device = describeAgent(event.userAgent, t);
  const provider = PROVIDER_NAMES[d.provider ?? ''] ?? d.provider ?? t('account.activity.anAccount');
  const key = (name: string) => `account.activity.${name}`;
  switch (event.kind) {
    case 'created':
      return { icon: Sparkles, title: t(key('created')) };
    case 'signed-in':
      return {
        icon: device.kind === 'riven' ? AGENT_ICONS.riven : LogIn,
        title: device.kind === 'riven' ? t(key('signedInRiven')) : t(key('signedIn'), { device: device.name }),
      };
    case 'signed-out':
      return { icon: LogOut, title: t(key('signedOut'), { device: device.name }) };
    case 'device-removed':
      return { icon: MonitorX, title: t(key('removed'), { device: device.name }) };
    case 'name':
      return { icon: UserPen, title: d.to ? t(key('name'), { name: d.to }) : t(key('nameRemoved')) };
    case 'username':
      return { icon: AtSign, title: t(key('username'), { name: `@${d.to}` }) };
    case 'picture': {
      const from = PROVIDER_NAMES[d.source ?? ''];
      return {
        icon: Image,
        title: !d.source
          ? t(key('pictureRemoved'))
          : from
            ? t(key('pictureFrom'), { provider: from })
            : t(key('picture')),
      };
    }
    case 'linked':
      return { icon: KeyRound, title: t(key('linked'), { provider }) };
    case 'unlinked':
      return { icon: Unlink, title: t(key('unlinked'), { provider }) };
    case 'skin': {
      const reset = d.change === 'reset';
      return {
        icon: Shirt,
        title: d.name
          ? t(key(reset ? 'skinReset' : 'skin'), { name: d.name })
          : t(key(reset ? 'skinResetAny' : 'skinAny')),
      };
    }
    case 'nick-added':
      return { icon: UserPlus, title: t(key('nickAdded'), { name: d.name }) };
    case 'nick-removed':
      return { icon: UserMinus, title: t(key('nickRemoved'), { name: d.name }) };
    case 'app':
      return { icon: Sparkles, title: t(key('app'), { app: APPS[d.clientId ?? '']?.name ?? d.clientId }) };
    case 'app-removed':
      return { icon: Unplug, title: t(key('appRemoved'), { app: APPS[d.clientId ?? '']?.name ?? d.clientId }) };
  }
}

/** The device, unless the title names it, and the place, or the IP when the place is unknown. */
function where(event: ActivityEvent): string {
  const named = ['signed-in', 'signed-out', 'device-removed'].includes(event.kind);
  const device = event.userAgent && !named ? describeAgent(event.userAgent, t).name : '';
  return [device, format.place(event.city, event.country) ?? event.ipAddress ?? ''].filter(Boolean).join(' · ');
}
</script>

<template>
	<AccountSection
		id="activity"
		class="activity"
		:title="$t('account.activity.title')"
		:lead="$t('account.activity.lede')"
	>
		<div v-if="events?.length" class="scroll">
			<ul class="list">
				<li v-for="event in events" :key="event.id">
					<span class="mark"><component :is="describe(event).icon" :size="17" :stroke-width="1.7" /></span>
					<div class="grow">
						<span class="name">{{ describe(event).title }}</span>
						<span v-if="where(event)" class="sub" :title="event.ipAddress ?? undefined">{{ where(event) }}</span>
					</div>
					<span class="when">{{ format.relative(event.createdAt) }}</span>
				</li>
			</ul>
		</div>
		<button v-if="next" type="button" class="btn quiet small list-more" :disabled="busy" @click="load(next)">
			{{ busy ? $t('common.loading') : $t('account.activity.older') }}
		</button>
		<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
	</AccountSection>
</template>

<style scoped>
/* Takes the row height from the card beside it, so the list scrolls inside. */
.activity {
	min-height: 440px;
}

.activity :deep(.as__body) {
	flex: 1;
	min-height: 0;
}

.scroll {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	contain: size;
	border-radius: var(--r-3);
}

.mark {
	display: grid;
	flex: none;
	place-items: center;
	width: 34px;
	height: 34px;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
	color: var(--fg);
}

.when {
	flex: none;
	padding-right: 6px;
	font: 400 12.5px/1 var(--font-sans);
	color: var(--mute);
}
</style>
