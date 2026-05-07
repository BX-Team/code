<script setup lang="ts">
import { BrandMark } from '@bx-team/ui';
import {
  ChevronsUpDown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Shield,
  TrendingUp,
} from '@lucide/vue';
import { openCreateProjectDialog } from '@/composables/useCreateProject';
import { openSearchDialog } from '@/composables/useSearchDialog';
import { authClient } from '@/lib/auth-client';

defineProps<{ open: boolean }>();

const { data: projects } = useProjects();
const { data: session } = useSession();
const user = computed(() => session.value?.user);

const route = useRoute();
const currentSlug = computed(() => route.params.slug as string | undefined);

const navItems = [
  { id: 'overview', label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { id: 'search', label: 'Search', icon: Search, action: 'search' as const },
  { id: 'issues', label: 'Issues', href: '/dashboard/issues', icon: Shield },
];

function isActiveNav(item: { href?: string; action?: string }) {
  if (!item.href) return false;
  if (item.href === '/dashboard') return route.path === '/dashboard';
  return route.path.startsWith(item.href);
}

function handleNavItem(item: { href?: string; action?: string }) {
  if (item.action === 'search') {
    openSearchDialog();
    return;
  }
  if (item.href) navigateTo(item.href);
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

function goSettings() {
  showUserMenu.value = false;
  navigateTo('/dashboard/settings');
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (showUserMenu.value && !target.closest('.user-area')) {
    showUserMenu.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
	<aside class="side" :class="{ collapsed: !open }">
		<div class="side-inner">
			<div class="brand">
				<BrandMark :size="22" />
				<span>Pulsify</span>
			</div>

			<nav class="nav-section">
				<button
					v-for="item in navItems"
					:key="item.id"
					class="nav-item"
					:class="{ active: isActiveNav(item) }"
					@click="handleNavItem(item)"
				>
					<component :is="item.icon" class="ic" :size="15" :stroke-width="1.6" />
					{{ item.label }}
				</button>
			</nav>

			<div class="nav-h">
				Projects
				<span class="add" title="New project" @click="openCreateProjectDialog()">
					<Plus :size="11" :stroke-width="2" />
				</span>
			</div>

			<nav class="nav-section proj-list">
				<button
					v-for="project in projects ?? []"
					:key="project.id"
					class="nav-item"
					:class="{ active: currentSlug === project.slug }"
					@click="navigateTo(`/dashboard/${project.slug}`)"
				>
					<span class="proj-dot" />
					{{ project.name }}
					<span class="meta">{{ project.type.charAt(0).toUpperCase() + project.type.slice(1) }}</span>
				</button>
			</nav>

			<div class="side-foot">
				<button class="nav-item" @click="navigateTo('/dashboard/settings')">
					<Settings class="ic" :size="15" :stroke-width="1.6" />
					Settings
				</button>
				<button class="nav-item">
					<HelpCircle class="ic" :size="15" :stroke-width="1.6" />
					Get help
				</button>

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
							<button class="menu-item" @click="goSettings">
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
</template>

<style scoped>
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

.nav-section {
	display: flex;
	flex-direction: column;
	gap: 1px;
	margin-bottom: 4px;
}
.proj-list { flex: 1; overflow-y: auto; }
.proj-list::-webkit-scrollbar { width: 0; }

.nav-h {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font: 600 10.5px var(--font-mono);
	letter-spacing: .08em;
	text-transform: uppercase;
	color: var(--mute);
	padding: 14px 10px 6px;
	white-space: nowrap;
}
.add {
	display: inline-grid;
	place-items: center;
	width: 18px;
	height: 18px;
	border-radius: 4px;
	color: var(--mute);
	border: 1px solid transparent;
	cursor: pointer;
}
.add:hover { color: var(--fg-hi); background: rgba(255,255,255,.05); border-color: var(--line); }

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

.meta {
	margin-left: auto;
	font: 500 10.5px var(--font-mono);
	color: var(--mute);
}
.nav-item.active .meta { color: var(--dim); }

.proj-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 6px color-mix(in oklab, var(--ok) 60%, transparent);
	flex: 0 0 6px;
}

.side-foot {
	margin-top: auto;
	display: flex;
	flex-direction: column;
	gap: 1px;
	padding-top: 12px;
	border-top: 1px solid var(--line);
}

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

.menu-sep {
	height: 1px;
	background: var(--line);
	margin: 3px 0;
}

.menu-enter-active { transition: opacity .12s ease, transform .12s ease; }
.menu-leave-active { transition: opacity .1s ease, transform .1s ease; }
.menu-enter-from  { opacity: 0; transform: translateY(4px); }
.menu-leave-to    { opacity: 0; transform: translateY(4px); }
</style>
