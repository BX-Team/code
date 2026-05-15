<script setup lang="ts">
import { BrandMark } from '@bx-team/ui';
import { ArrowLeft, ChevronsUpDown, LayoutDashboard, LogOut, PanelLeft, Settings, Shield, Users } from '@lucide/vue';
import { Toaster } from 'vue-sonner';
import { authClient } from '@/lib/auth-client';

const MOBILE_BP = 820;
const sidebarOpen = ref(true);

onMounted(() => {
  if (window.innerWidth < MOBILE_BP) sidebarOpen.value = false;
});

const route = useRoute();
watch(
  () => route.path,
  () => {
    if (window.innerWidth < MOBILE_BP) sidebarOpen.value = false;
  },
);

const { data: session } = useSession();
const user = computed(() => session.value?.user);

const navItems = [{ id: 'users', label: 'Users', href: '/admin', icon: Users }];

function isActive(href: string) {
  return route.path === href;
}

const showUserMenu = ref(false);

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

async function logout() {
  showUserMenu.value = false;
  await authClient.signOut();
  await navigateTo('/login');
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (showUserMenu.value && !target.closest('.user-area')) showUserMenu.value = false;
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
	<div class="app-shell">
		<aside class="side" :class="{ collapsed: !sidebarOpen }">
			<div class="side-inner">
				<div class="brand">
					<BrandMark :size="22" />
					<span>Admin</span>
					<span class="admin-badge">
						<Shield :size="10" :stroke-width="2.5" />
					</span>
				</div>

				<nav class="nav-section">
					<button
						v-for="item in navItems"
						:key="item.id"
						class="nav-item"
						:class="{ active: isActive(item.href) }"
						@click="navigateTo(item.href)"
					>
						<component :is="item.icon" class="ic" :size="15" :stroke-width="1.6" />
						{{ item.label }}
					</button>
				</nav>

				<div class="side-foot">
					<button class="nav-item" @click="navigateTo('/dashboard')">
						<LayoutDashboard class="ic" :size="15" :stroke-width="1.6" />
						Dashboard
					</button>

					<a class="back-link" href="/">
						<ArrowLeft :size="13" :stroke-width="2" />
						Back to bxteam.org
					</a>

					<div class="user-area">
						<div class="user-row" @click="toggleUserMenu">
							<div class="avatar">{{ user?.name?.charAt(0)?.toUpperCase() ?? 'U' }}</div>
							<div class="user-info">
								<div class="uname">{{ user?.name ?? 'User' }}</div>
								<div class="uorg">{{ user?.email ?? '' }}</div>
							</div>
							<ChevronsUpDown class="chevron" :size="14" :stroke-width="1.6" />
						</div>

						<Transition name="menu">
							<div v-if="showUserMenu" class="user-menu">
								<button class="menu-item" @click="navigateTo('/dashboard/settings'); showUserMenu = false">
									<Settings :size="13" :stroke-width="1.6" />
									Settings
								</button>
								<div class="menu-sep" />
								<button class="menu-item danger" @click="logout">
									<LogOut :size="13" :stroke-width="1.6" />
									Sign out
								</button>
							</div>
						</Transition>
					</div>
				</div>
			</div>
		</aside>

		<Transition name="bd">
			<div v-if="sidebarOpen" class="mob-backdrop" @click="sidebarOpen = false" />
		</Transition>

		<div class="app-main">
			<header class="topbar">
				<button class="icon-btn" title="Toggle sidebar" @click="sidebarOpen = !sidebarOpen">
					<PanelLeft :size="16" :stroke-width="1.7" />
				</button>
				<div class="crumbs">
					<Shield :size="14" :stroke-width="1.7" class="crumb-icon" />
					<span>Admin Panel</span>
				</div>
			</header>

			<div class="app-scroll">
				<div class="page-sections">
					<slot />
				</div>
			</div>
		</div>

		<Teleport to="body">
			<Toaster position="bottom-right" rich-colors theme="dark" />
		</Teleport>
	</div>
</template>

<style scoped>
.app-shell {
	display: flex;
	height: 100dvh;
	overflow: hidden;
	background: var(--bg-0);
	font-family: var(--font-sans);
	font-size: 14px;
	color: var(--fg);
	-webkit-font-smoothing: antialiased;
}

.mob-backdrop { display: none; }

.bd-enter-active, .bd-leave-active { transition: opacity 0.2s ease; }
.bd-enter-from, .bd-leave-to { opacity: 0; }

@media (max-width: 820px) {
	.mob-backdrop {
		display: block;
		position: fixed;
		inset: 0;
		z-index: 55;
		background: rgba(0, 0, 0, 0.5);
		-webkit-backdrop-filter: blur(2px);
		backdrop-filter: blur(2px);
	}
}

.side {
	background: var(--bg-0);
	border-right: 1px solid var(--line);
	width: 240px;
	min-width: 0;
	overflow: hidden;
	flex-shrink: 0;
	transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.side.collapsed { width: 0; }

.side-inner {
	width: 240px;
	height: 100%;
	display: flex;
	flex-direction: column;
	padding: 14px 12px;
	overflow-y: auto;
	overflow-x: hidden;
	opacity: 1;
	transition: opacity 0.18s ease;
}
.side.collapsed .side-inner { opacity: 0; pointer-events: none; }
.side-inner::-webkit-scrollbar { width: 0; }

.brand {
	display: flex;
	align-items: center;
	gap: 9px;
	padding: 6px 8px 14px;
	font: 700 15px var(--font-sans);
	color: var(--fg-hi);
	letter-spacing: -0.01em;
	white-space: nowrap;
}

.admin-badge {
	display: inline-grid;
	place-items: center;
	width: 18px;
	height: 18px;
	border-radius: 5px;
	background: color-mix(in oklab, var(--brand) 20%, transparent);
	border: 1px solid color-mix(in oklab, var(--brand) 40%, transparent);
	color: var(--brand);
	margin-left: auto;
}

.nav-section {
	display: flex;
	flex-direction: column;
	gap: 1px;
	margin-bottom: 4px;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 7px 10px;
	border-radius: 6px;
	color: var(--dim);
	font: 500 13px var(--font-sans);
	cursor: pointer;
	transition: background .15s, color .15s;
	border: none;
	background: transparent;
	text-align: left;
	width: 100%;
	white-space: nowrap;
}
.nav-item:hover { background: rgba(255,255,255,.04); color: var(--fg-hi); }
.nav-item.active { background: rgba(255,255,255,.06); color: var(--fg-hi); }

.ic { color: var(--mute); flex: 0 0 15px; }
.nav-item.active .ic { color: var(--brand); }

.side-foot {
	margin-top: auto;
	display: flex;
	flex-direction: column;
	gap: 1px;
	padding-top: 12px;
	border-top: 1px solid var(--line);
}

.back-link {
	display: flex;
	align-items: center;
	gap: 7px;
	padding: 7px 10px;
	margin-top: 6px;
	border: 1px solid var(--line);
	border-radius: 7px;
	color: var(--mute);
	font: 500 12px var(--font-sans);
	text-decoration: none;
	transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.back-link:hover { color: var(--fg-hi); border-color: var(--line-2); background: rgba(255,255,255,.03); }

.user-area { position: relative; margin-top: 4px; }

.user-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px;
	border-radius: 8px;
	cursor: pointer;
	user-select: none;
}
.user-row:hover { background: rgba(255,255,255,.04); }

.avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);
	display: grid;
	place-items: center;
	color: var(--bg-0);
	font: 700 11px var(--font-sans);
	flex: 0 0 28px;
}
.uname { font: 600 12.5px var(--font-sans); color: var(--fg-hi); line-height: 1.2; }
.uorg  { font: 400 11px var(--font-mono); color: var(--mute); line-height: 1.2; }
.chevron { margin-left: auto; color: var(--mute); }

.user-menu {
	position: absolute;
	bottom: calc(100% + 6px);
	left: 0;
	right: 0;
	background: var(--bg-2);
	border: 1px solid var(--line);
	border-radius: 10px;
	padding: 4px;
	box-shadow: 0 8px 32px rgba(0,0,0,.4);
	z-index: 50;
}

.menu-item {
	display: flex;
	align-items: center;
	gap: 9px;
	width: 100%;
	padding: 8px 10px;
	font: 500 13px var(--font-sans);
	color: var(--dim);
	background: transparent;
	border: none;
	border-radius: 7px;
	cursor: pointer;
	text-align: left;
}
.menu-item:hover { background: rgba(255,255,255,.05); color: var(--fg-hi); }
.menu-item.danger:hover { color: var(--err); }

.menu-sep { height: 1px; background: var(--line); margin: 3px 0; }

.menu-enter-active { transition: opacity .12s ease, transform .12s ease; }
.menu-leave-active { transition: opacity .1s ease, transform .1s ease; }
.menu-enter-from  { opacity: 0; transform: translateY(4px); }
.menu-leave-to    { opacity: 0; transform: translateY(4px); }

@media (max-width: 820px) {
	.side {
		position: fixed;
		top: 0; left: 0;
		height: 100dvh;
		z-index: 60;
		width: 240px;
		transform: translateX(0);
		transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.side.collapsed { width: 240px; transform: translateX(-100%); }
	.side.collapsed .side-inner { opacity: 1; pointer-events: auto; }
}

.app-main {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-width: 0;
	flex: 1;
}

.topbar {
	display: flex;
	align-items: center;
	padding: 0 20px;
	height: 52px;
	border-bottom: 1px solid var(--line);
	gap: 16px;
	flex-shrink: 0;
}

.crumbs {
	display: flex;
	align-items: center;
	gap: 8px;
	font: 600 14px var(--font-sans);
	color: var(--fg-hi);
}
.crumb-icon { color: var(--brand); }

.icon-btn {
	display: inline-grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: 7px;
	border: 1px solid transparent;
	color: var(--dim);
	background: transparent;
	cursor: pointer;
}
.icon-btn:hover { background: rgba(255,255,255,.04); color: var(--fg-hi); border-color: var(--line); }

.app-scroll {
	overflow-y: auto;
	flex: 1;
}
.app-scroll::-webkit-scrollbar { width: 10px; }
.app-scroll::-webkit-scrollbar-thumb {
	background: var(--bg-2);
	border-radius: 5px;
	border: 2px solid var(--bg-0);
}

.page-sections {
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 24px 0 60px;
}
</style>
