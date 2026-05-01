<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { User } from '@lucide/vue'

const links = [
  { label: 'Downloads', to: '/downloads' },
  { label: 'Documentation', to: '/docs' },
  { label: 'Team', to: '/team' },
  { label: 'Status', to: 'https://status.bxteam.org' },
  { label: 'Maven', to: 'https://repo.bxteam.org' }
]

const headers = useRequestHeaders(['cookie'])
const { data: session, pending: isPending, refresh: refreshSession } = await useAsyncData(
  'auth-session',
  () => authClient.getSession({ fetchOptions: { headers } }).then(r => r.data ?? null)
)

async function logout() {
  await authClient.signOut()
  await refreshSession()
  navigateTo('/login')
}

</script>

<template>
  <div class="navwrap">
    <nav class="bar">
      <NuxtLink to="/" class="brand">
        <AppBrandMark />
        BX Team
      </NuxtLink>

      <div class="links">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          :external="l.to.startsWith('http')"
          :target="l.to.startsWith('http') ? '_blank' : undefined"
          :rel="l.to.startsWith('http') ? 'noopener noreferrer' : undefined"
        >{{ l.label }}</NuxtLink>
      </div>

      <div class="right">
        <a href="https://discord.gg/bx-team" target="_blank" rel="noopener noreferrer" class="demo">Discord</a>

        <template v-if="!isPending">
          <!-- not logged in -->
          <Button v-if="!session" as-child variant="pill" size="nav">
            <NuxtLink to="/login">Login</NuxtLink>
          </Button>

          <!-- logged in -->
          <DropdownMenu v-else>
            <DropdownMenuTrigger as-child>
              <button class="avatar">
                <User :size="20" stroke-width="1.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-52">
              <DropdownMenuLabel class="flex flex-col gap-0.5">
                <span class="text-sm font-semibold text-foreground">{{ session.user.name }}</span>
                <span class="text-xs font-normal text-muted-foreground truncate">{{ session.user.email }}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem as-child>
                <NuxtLink to="/dashboard">Dashboard</NuxtLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-destructive focus:text-destructive" @click="logout">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>

        <!-- skeleton while session loads -->
        <div v-else class="avatar-skeleton" />
      </div>
    </nav>
  </div>
</template>

<style scoped>
/* ── Profile button ── */
.profile-wrap {
  position: relative;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px solid var(--line-2);
  background: var(--bg-3);
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.avatar:hover {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

.avatar-skeleton {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg-3);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 0.25; }
}

</style>
