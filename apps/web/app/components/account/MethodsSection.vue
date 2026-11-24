<script setup lang="ts">
import { Mail } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import discordSvgRaw from '~/assets/external/discord.svg?raw';
import githubSvgRaw from '~/assets/external/github.svg?raw';
import { auth } from '~/lib/auth';

defineProps<{ email: string }>();

type Provider = 'discord' | 'github';

const PROVIDERS: { id: Provider; name: string; icon: string }[] = [
  { id: 'discord', name: 'Discord', icon: discordSvgRaw },
  { id: 'github', name: 'GitHub', icon: githubSvgRaw },
];

/** Provider id to Better Auth's own account id, which unlinking takes. */
const linked = ref<Map<string, string> | null>(null);
const busy = ref('');
const { refresh } = useAccountData();
const error = ref('');

const route = useRoute();
const returned = computed(() =>
  typeof route.query.error === 'string' ? 'Connecting did not go through. Try again.' : '',
);

onMounted(load);

async function load() {
  const { data } = await auth.listAccounts();
  linked.value = new Map((data ?? []).map(account => [account.providerId, account.id]));
}

async function connect(provider: Provider) {
  busy.value = provider;
  error.value = '';
  const { error: failed } = await auth.linkSocial({
    provider,
    callbackURL: `${location.origin}/account/security`,
    errorCallbackURL: `${location.origin}/account/security`,
  });
  if (failed) {
    busy.value = '';
    error.value = 'Could not start connecting.';
  }
}

async function disconnect(provider: Provider) {
  const accountId = linked.value?.get(provider);
  if (!accountId) return;
  busy.value = provider;
  error.value = '';
  const { error: failed } = await auth.unlinkAccount({ accountId });
  busy.value = '';
  if (failed) {
    error.value = failed.message ?? 'Could not disconnect.';
    return;
  }
  await Promise.all([load(), refresh()]);
}
</script>

<template>
	<AccountSection id="methods" title="Sign-in methods" lead="No passwords. Any of these opens this BX ID.">
		<ul class="list">
			<li>
				<span class="mark"><Mail :size="18" :stroke-width="1.7" /></span>
				<div class="grow">
					<span class="name">Email code</span>
					<span class="sub">{{ email }}</span>
				</div>
				<span class="badge">Always on</span>
			</li>
			<li v-for="provider in PROVIDERS" :key="provider.id">
				<span class="mark" aria-hidden="true" v-html="provider.icon" />
				<div class="grow">
					<span class="name">{{ provider.name }}</span>
					<span class="sub">{{ linked?.has(provider.id) ? 'Connected' : 'Not connected' }}</span>
				</div>
				<div v-if="linked" class="actions">
					<button
						v-if="linked.has(provider.id)"
						type="button"
						class="btn quiet small danger"
						:disabled="busy === provider.id"
						@click="disconnect(provider.id)"
					>
						Disconnect
					</button>
					<button v-else type="button" class="btn small" :disabled="busy === provider.id" @click="connect(provider.id)">
						Connect
					</button>
				</div>
			</li>
		</ul>
		<p v-if="error || returned" class="hint bad" role="alert">{{ error || returned }}</p>
	</AccountSection>
</template>

<style scoped>
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

.mark :deep(svg) {
	width: 18px;
	height: 18px;
}
</style>
