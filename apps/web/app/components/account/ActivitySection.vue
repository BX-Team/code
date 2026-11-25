<script setup lang="ts">
import type { ActivityEvent } from '@bx-team/types/schema/bxid';
import { AtSign, Image, KeyRound, LogIn, LogOut, MonitorX, Shirt, Sparkles, Unlink, UserPen } from '@lucide/vue';
import { type Component, onMounted, ref, watch } from 'vue';
import { AGENT_ICONS, describeAgent } from '~/lib/agents';
import { APPS, auth, fetchActivity, PROVIDER_NAMES } from '~/lib/auth';
import { relativeTime } from '~/utils/datetime';

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
    error.value = 'Your activity could not be loaded.';
  }
  busy.value = false;
}

// The other cards on this page refresh these after a change, which also lands here as an event.
const session = auth.useSession();
const { links, sessions } = useAccountData();
watch([links, sessions, () => session.value.data?.user.updatedAt?.toString()], (_, before) => {
  if (before.some(Boolean)) load();
});

const PICTURE_FROM: Record<string, string> = { discord: 'from Discord', github: 'from GitHub' };

function describe(event: ActivityEvent): { icon: Component; title: string } {
  const d = event.detail ?? {};
  const device = describeAgent(event.userAgent);
  const provider = PROVIDER_NAMES[d.provider ?? ''] ?? d.provider ?? 'an account';
  switch (event.kind) {
    case 'created':
      return { icon: Sparkles, title: 'Created this BX ID' };
    case 'signed-in':
      return {
        icon: device.kind === 'riven' ? AGENT_ICONS.riven : LogIn,
        title: device.kind === 'riven' ? 'Signed in to Riven Launcher' : `Signed in on ${device.name}`,
      };
    case 'signed-out':
      return { icon: LogOut, title: `Signed out on ${device.name}` };
    case 'device-removed':
      return { icon: MonitorX, title: `Signed ${device.name} out remotely` };
    case 'name':
      return { icon: UserPen, title: d.to ? `Changed display name to ${d.to}` : 'Removed the display name' };
    case 'username':
      return { icon: AtSign, title: `Changed username to @${d.to}` };
    case 'picture':
      return {
        icon: Image,
        title: d.source
          ? `Changed profile picture ${PICTURE_FROM[d.source] ?? ''}`.trim()
          : 'Removed the profile picture',
      };
    case 'linked':
      return { icon: KeyRound, title: `Connected ${provider}` };
    case 'unlinked':
      return { icon: Unlink, title: `Disconnected ${provider}` };
    case 'skin':
      return { icon: Shirt, title: d.change === 'reset' ? 'Removed the skin' : 'Changed skin' };
    case 'app':
      return { icon: Sparkles, title: `Connected ${APPS[d.clientId ?? '']?.name ?? d.clientId}` };
  }
}

/** Where it happened: the device, unless the title already names it, and the address. */
function where(event: ActivityEvent): string {
  const named = ['signed-in', 'signed-out', 'device-removed'].includes(event.kind);
  const device = event.userAgent && !named ? describeAgent(event.userAgent).name : '';
  return [device, event.ipAddress ?? ''].filter(Boolean).join(' · ');
}
</script>

<template>
	<AccountSection id="activity" title="Recent activity" lead="Sign-ins and changes to this BX ID, newest first.">
		<ul v-if="events?.length" class="list">
			<li v-for="event in events" :key="event.id">
				<span class="mark"><component :is="describe(event).icon" :size="17" :stroke-width="1.7" /></span>
				<div class="grow">
					<span class="name">{{ describe(event).title }}</span>
					<span v-if="where(event)" class="sub">{{ where(event) }}</span>
				</div>
				<span class="when">{{ relativeTime(event.createdAt) }}</span>
			</li>
		</ul>
		<button v-if="next" type="button" class="btn quiet small list-more" :disabled="busy" @click="load(next)">
			{{ busy ? 'Loading…' : 'Show older' }}
		</button>
		<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
	</AccountSection>
</template>

<style scoped>
.list {
	max-height: 520px;
	overflow-y: auto;
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
