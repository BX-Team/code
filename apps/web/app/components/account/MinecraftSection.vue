<script setup lang="ts">
import type { MinecraftProfile } from '@bx-team/types/schema/bxid';
import { onMounted, ref } from 'vue';
import { fetchMinecraftProfiles, unlinkMinecraftProfile } from '~/lib/auth';

const profiles = ref<MinecraftProfile[] | null>(null);
const error = ref('');
const busy = ref('');

onMounted(async () => {
  try {
    profiles.value = await fetchMinecraftProfiles();
  } catch {
    error.value = 'Could not load your Minecraft profiles.';
  }
});

async function unlink(profile: MinecraftProfile) {
  busy.value = profile.id;
  error.value = '';
  try {
    await unlinkMinecraftProfile(profile.id);
    profiles.value = profiles.value?.filter(p => p.id !== profile.id) ?? null;
  } catch {
    error.value = `Could not unlink ${profile.name}.`;
  } finally {
    busy.value = '';
  }
}
</script>

<template>
	<AccountSection
		id="minecraft"
		title="Minecraft"
		lead="Profiles you own, proven through Mojang when you link them in Riven Launcher. Friends see them next to your name."
	>
		<ul v-if="profiles?.length" class="list">
			<li v-for="profile in profiles" :key="profile.id">
				<img
					class="head"
					:src="`https://crafthead.net/avatar/${profile.id}/36`"
					alt=""
					width="36"
					height="36"
				/>
				<div class="grow">
					<span class="name mono">{{ profile.name }}</span>
					<span class="sub mono">{{ profile.id }}</span>
				</div>
				<div class="actions">
					<button
						type="button"
						class="btn quiet small danger"
						:disabled="busy === profile.id"
						:aria-label="`Unlink ${profile.name}`"
						@click="unlink(profile)"
					>
						Unlink
					</button>
				</div>
			</li>
		</ul>
		<p v-else-if="profiles" class="empty">
			No profile linked yet. Sign in to Riven Launcher with this BX ID and link the Minecraft account you play with.
		</p>
		<p v-if="error" class="hint bad" role="alert">{{ error }}</p>
	</AccountSection>
</template>

<style scoped>
.head {
	flex: none;
	border-radius: var(--r-1);
	image-rendering: pixelated;
}

.mono {
	font-family: var(--font-mono);
}
</style>
