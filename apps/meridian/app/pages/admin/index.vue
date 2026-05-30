<script setup lang="ts">
import { BadgeCheck, Ban, CheckCircle, FolderOpen, Search, Shield, Trash2, Users, X } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { authClient } from '@/lib/auth-client';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Admin Panel', titleTemplate: '%s | Pulsify' });

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  createdAt: string;
  image: string | null;
}

interface UserProject {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  verified: boolean;
  createdAt: string;
}

const search = ref('');
const filterStatus = ref<'all' | 'banned' | 'active'>('all');
const page = ref(0);
const PAGE_SIZE = 30;

const {
  data: usersData,
  refresh,
  pending,
} = await useAsyncData(
  'admin-users',
  () =>
    authClient.admin
      .listUsers({
        limit: PAGE_SIZE,
        offset: page.value * PAGE_SIZE,
        ...(search.value
          ? { searchValue: search.value, searchField: 'email' as const, searchOperator: 'contains' as const }
          : {}),
        ...(filterStatus.value === 'banned'
          ? { filterField: 'banned', filterValue: true, filterOperator: 'eq' as const }
          : {}),
        ...(filterStatus.value === 'active'
          ? { filterField: 'banned', filterValue: false, filterOperator: 'eq' as const }
          : {}),
      })
      .then(r => r.data),
  { server: false, watch: [page, filterStatus] },
);

const users = computed(() => (usersData.value?.users as AdminUser[] | undefined) ?? []);
const totalUsers = computed(() => usersData.value?.total ?? 0);
const totalPages = computed(() => Math.ceil(totalUsers.value / PAGE_SIZE));

let searchTimeout: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 0;
    refresh();
  }, 300);
});

watch(filterStatus, () => {
  page.value = 0;
});

const stats = computed(() => {
  return {
    total: totalUsers.value,
    shown: users.value.length,
    banned: users.value.filter(u => u.banned).length,
  };
});

const banTarget = ref<AdminUser | null>(null);
const banReason = ref('');
const banLoading = ref(false);
const deleteTarget = ref<AdminUser | null>(null);
const deleteLoading = ref(false);
const projectsTarget = ref<AdminUser | null>(null);
const projectsData = ref<UserProject[]>([]);
const projectsLoading = ref(false);
const verifyingId = ref<string | null>(null);

async function toggleVerified(p: UserProject) {
  if (verifyingId.value) return;
  verifyingId.value = p.id;
  try {
    const updated = await $fetch<{ id: string; verified: boolean }>(`/api/admin/projects/${p.id}/verify`, {
      method: 'PATCH',
      body: { verified: !p.verified },
    });
    p.verified = updated.verified;
    toast.success(updated.verified ? `${p.name} verified` : `${p.name} unverified`);
  } catch (err: any) {
    toast.error(err?.data?.message ?? 'Failed to update verification');
  } finally {
    verifyingId.value = null;
  }
}

async function submitBan() {
  if (!banTarget.value || banLoading.value) return;
  banLoading.value = true;
  try {
    const { error } = await authClient.admin.banUser({
      userId: banTarget.value.id,
      ...(banReason.value ? { banReason: banReason.value } : {}),
    });
    if (error) throw error;
    toast.success(`${banTarget.value.name} has been banned`);
    banTarget.value = null;
    banReason.value = '';
    await refresh();
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to ban user');
  } finally {
    banLoading.value = false;
  }
}

async function unban(u: AdminUser) {
  try {
    const { error } = await authClient.admin.unbanUser({ userId: u.id });
    if (error) throw error;
    toast.success(`${u.name} has been unbanned`);
    await refresh();
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to unban user');
  }
}

async function confirmDelete() {
  if (!deleteTarget.value || deleteLoading.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await authClient.admin.removeUser({ userId: deleteTarget.value.id });
    if (error) throw error;
    toast.success(`${deleteTarget.value.name} has been deleted`);
    deleteTarget.value = null;
    await refresh();
  } catch (err: any) {
    toast.error(err?.data?.message ?? err?.message ?? 'Failed to delete user');
  } finally {
    deleteLoading.value = false;
  }
}

async function openProjects(u: AdminUser) {
  projectsTarget.value = u;
  projectsData.value = [];
  projectsLoading.value = true;
  try {
    projectsData.value = await $fetch<UserProject[]>(`/api/admin/users/${u.id}/projects`);
  } catch {
    toast.error('Failed to load projects');
  } finally {
    projectsLoading.value = false;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name: string) {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
</script>

<template>
  <div class="px-4 lg:px-6">
    <div class="page-head">
      <div>
        <h1 class="page-title">Users</h1>
        <p class="page-desc">Manage all registered users, roles, and access.</p>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-ic">
          <Users :size="14" :stroke-width="1.7" />
        </div>
        <div>
          <div class="stat-val">{{ totalUsers }}</div>
          <div class="stat-lbl">Total users</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-ic admin">
          <Shield :size="14" :stroke-width="1.7" />
        </div>
        <div>
          <div class="stat-val">{{ users.filter(u => u.role === 'admin').length }}</div>
          <div class="stat-lbl">Admins (this page)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-ic banned">
          <Ban :size="14" :stroke-width="1.7" />
        </div>
        <div>
          <div class="stat-val">{{ stats.banned }}</div>
          <div class="stat-lbl">Banned (this page)</div>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-wrap">
        <Search :size="14" :stroke-width="1.7" class="search-ic" />
        <input v-model="search" class="search-input" placeholder="Search by email…" type="text" />
        <button v-if="search" class="search-clear" @click="search = ''">
          <X :size="13" :stroke-width="2" />
        </button>
      </div>
      <div class="filter-tabs">
        <button class="ftab" :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">All</button>
        <button class="ftab" :class="{ active: filterStatus === 'active' }" @click="filterStatus = 'active'">Active</button>
        <button class="ftab" :class="{ active: filterStatus === 'banned' }" @click="filterStatus = 'banned'">Banned</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Projects</th>
            <th>Joined</th>
            <th class="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending && !usersData">
            <td colspan="6" class="td-empty">
              <div class="loading-dots">
                <span /><span /><span />
              </div>
            </td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="6" class="td-empty">No users found</td>
          </tr>
          <template v-else>
            <tr v-for="u in users" :key="u.id" class="user-row" :class="{ 'is-banned': u.banned }">
              <td class="td-user">
                <div class="user-avatar">{{ initials(u.name) }}</div>
                <div class="user-info">
                  <span class="user-name">{{ u.name }}</span>
                  <span class="user-email">{{ u.email }}</span>
                </div>
              </td>
              <td>
                <span class="badge" :class="u.role === 'admin' ? 'badge-admin' : 'badge-user'">
                  <Shield v-if="u.role === 'admin'" :size="10" :stroke-width="2.5" />
                  {{ u.role ?? 'user' }}
                </span>
              </td>
              <td>
                <span v-if="u.banned" class="badge badge-banned" :title="u.banReason ?? undefined">
                  <Ban :size="10" :stroke-width="2.5" />
                  Banned
                </span>
                <span v-else class="badge badge-active">
                  <CheckCircle :size="10" :stroke-width="2.5" />
                  Active
                </span>
              </td>
              <td>
                <button class="proj-btn" @click="openProjects(u)">
                  <FolderOpen :size="12" :stroke-width="1.7" />
                  View
                </button>
              </td>
              <td class="td-date">{{ formatDate(u.createdAt) }}</td>
              <td class="td-actions">
                <div class="action-group">
                  <button v-if="u.banned" class="act-btn act-unban" title="Unban user" @click="unban(u)">
                    <CheckCircle :size="13" :stroke-width="1.8" />
                  </button>
                  <button v-else class="act-btn act-ban" title="Ban user" @click="banTarget = u">
                    <Ban :size="13" :stroke-width="1.8" />
                  </button>
                  <button class="act-btn act-delete" title="Delete user" @click="deleteTarget = u">
                    <Trash2 :size="13" :stroke-width="1.8" />
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="pagination">
        <button class="pg-btn" :disabled="page === 0" @click="page--">Previous</button>
        <span class="pg-info">Page {{ page + 1 }} of {{ totalPages }}</span>
        <button class="pg-btn" :disabled="page >= totalPages - 1" @click="page++">Next</button>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="modal">
      <div v-if="banTarget" class="modal-overlay" @click.self="banTarget = null">
        <div class="modal">
          <div class="modal-head">
            <div class="modal-icon ban-icon">
              <Ban :size="16" :stroke-width="1.8" />
            </div>
            <div>
              <div class="modal-title">Ban user</div>
              <div class="modal-sub">{{ banTarget.name }} · {{ banTarget.email }}</div>
            </div>
            <button class="modal-close" @click="banTarget = null">
              <X :size="14" :stroke-width="2" />
            </button>
          </div>
          <div class="modal-body">
            <label class="field-label">Reason <span class="field-opt">(optional)</span></label>
            <input v-model="banReason" class="field-input" placeholder="e.g. Spamming, abuse…" type="text" />
          </div>
          <div class="modal-foot">
            <button class="btn-ghost" @click="banTarget = null">Cancel</button>
            <button class="btn-danger" :disabled="banLoading" @click="submitBan">
              <Ban :size="13" :stroke-width="2" />
              {{ banLoading ? 'Banning…' : 'Ban user' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal">
          <div class="modal-head">
            <div class="modal-icon delete-icon">
              <Trash2 :size="16" :stroke-width="1.8" />
            </div>
            <div>
              <div class="modal-title">Delete user</div>
              <div class="modal-sub">{{ deleteTarget.name }} · {{ deleteTarget.email }}</div>
            </div>
            <button class="modal-close" @click="deleteTarget = null">
              <X :size="14" :stroke-width="2" />
            </button>
          </div>
          <div class="modal-body">
            <p class="modal-warn">
              This will permanently delete the user and all their projects, tokens, and data. This action cannot be undone.
            </p>
          </div>
          <div class="modal-foot">
            <button class="btn-ghost" @click="deleteTarget = null">Cancel</button>
            <button class="btn-danger" :disabled="deleteLoading" @click="confirmDelete">
              <Trash2 :size="13" :stroke-width="2" />
              {{ deleteLoading ? 'Deleting…' : 'Delete permanently' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="projectsTarget" class="modal-overlay" @click.self="projectsTarget = null">
        <div class="modal modal-wide">
          <div class="modal-head">
            <div class="modal-icon proj-icon">
              <FolderOpen :size="16" :stroke-width="1.8" />
            </div>
            <div>
              <div class="modal-title">Projects</div>
              <div class="modal-sub">{{ projectsTarget.name }} · {{ projectsTarget.email }}</div>
            </div>
            <button class="modal-close" @click="projectsTarget = null">
              <X :size="14" :stroke-width="2" />
            </button>
          </div>
          <div class="modal-body proj-body">
            <div v-if="projectsLoading" class="loading-dots" style="justify-content:center;padding:20px 0">
              <span /><span /><span />
            </div>
            <div v-else-if="!projectsData.length" class="proj-empty">No projects found</div>
            <div v-else class="proj-list">
              <div v-for="p in projectsData" :key="p.id" class="proj-item">
                <div class="proj-info">
                  <span class="proj-name">
                    {{ p.name }}
                    <BadgeCheck v-if="p.type !== 'server' && p.verified" :size="13" :stroke-width="2.2" class="verified-ic" />
                  </span>
                  <span class="proj-slug">{{ p.slug }}</span>
                </div>
                <span class="badge badge-type">{{ p.type }}</span>
                <button
                  v-if="p.type !== 'server'"
                  class="verify-btn"
                  :class="{ on: p.verified }"
                  :disabled="verifyingId === p.id"
                  :title="p.verified ? 'Revoke name ownership verification' : 'Verify name ownership (enables cross-server reports)'"
                  @click="toggleVerified(p)"
                >
                  {{ p.verified ? 'Unverify' : 'Verify' }}
                </button>
                <span class="proj-date">{{ formatDate(p.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.page-head {
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 4px;
  font: 700 20px var(--font-sans);
  color: var(--fg-hi);
  letter-spacing: -0.02em;
}

.page-desc {
  margin: 0;
  font: 400 13.5px var(--font-sans);
  color: var(--mute);
}

.stat-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 14px 16px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.stat-ic {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-3);
  border: 1px solid var(--line);
  color: var(--mute);
  flex: 0 0 32px;
}
.stat-ic.admin { color: var(--brand); background: var(--brand-soft); border-color: color-mix(in oklab, var(--brand) 30%, transparent); }
.stat-ic.banned { color: var(--err); background: color-mix(in oklab, var(--err) 15%, transparent); border-color: color-mix(in oklab, var(--err) 30%, transparent); }

.stat-val {
  font: 700 22px var(--font-sans);
  color: var(--fg-hi);
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 3px;
}
.stat-lbl { font: 500 11.5px var(--font-sans); color: var(--mute); }

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 380px;
}
.search-ic { position: absolute; left: 11px; color: var(--mute); pointer-events: none; }
.search-input {
  width: 100%;
  padding: 8px 32px 8px 34px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 8px;
  font: 400 13px var(--font-sans);
  color: var(--fg-hi);
  outline: none;
  transition: border-color .15s;
}
.search-input::placeholder { color: var(--mute); }
.search-input:focus { border-color: var(--line-2); }
.search-clear {
  position: absolute;
  right: 8px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: var(--mute);
  background: transparent;
  border: none;
  cursor: pointer;
}
.search-clear:hover { color: var(--fg-hi); background: rgba(255,255,255,.06); }

.filter-tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.ftab {
  padding: 5px 12px;
  font: 500 12.5px var(--font-sans);
  color: var(--mute);
  background: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all .15s;
}
.ftab:hover { color: var(--fg-hi); }
.ftab.active { background: var(--bg-3); color: var(--fg-hi); }

.table-wrap {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.user-table { width: 100%; border-collapse: collapse; }
.user-table th {
  padding: 10px 16px;
  text-align: left;
  font: 600 11px var(--font-mono);
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--mute);
  border-bottom: 1px solid var(--line);
  background: var(--bg-2);
}
.user-table th.th-actions { text-align: right; }
.user-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}
.user-row:last-child td { border-bottom: none; }
.user-row { transition: background .1s; }
.user-row:hover { background: rgba(255,255,255,.02); }
.user-row.is-banned { opacity: 0.65; }

.td-user { display: flex; align-items: center; gap: 11px; }
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);
  display: grid;
  place-items: center;
  color: var(--bg-0);
  font: 700 11px var(--font-sans);
  flex: 0 0 32px;
}
.user-info { display: flex; flex-direction: column; gap: 2px; }
.user-name { font: 500 13.5px var(--font-sans); color: var(--fg-hi); }
.user-email { font: 400 11.5px var(--font-mono); color: var(--mute); }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: 600 10.5px var(--font-mono);
  padding: 3px 8px;
  border-radius: 9999px;
  letter-spacing: .03em;
}
.badge-user { background: var(--bg-3); color: var(--dim); border: 1px solid var(--line); }
.badge-admin { background: var(--brand-soft); color: var(--brand); border: 1px solid color-mix(in oklab, var(--brand) 30%, transparent); }
.badge-active { background: color-mix(in oklab, var(--ok) 15%, transparent); color: var(--ok); border: 1px solid color-mix(in oklab, var(--ok) 30%, transparent); }
.badge-banned { background: color-mix(in oklab, var(--err) 15%, transparent); color: var(--err); border: 1px solid color-mix(in oklab, var(--err) 30%, transparent); }
.badge-type { background: var(--bg-3); color: var(--dim); border: 1px solid var(--line); text-transform: capitalize; }

.proj-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font: 500 12px var(--font-sans);
  color: var(--dim);
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
}
.proj-btn:hover { color: var(--fg-hi); border-color: var(--line-2); }

.td-date { font: 400 12px var(--font-mono); color: var(--mute); }
.td-actions { text-align: right; }
.action-group { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }

.act-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  color: var(--mute);
  transition: all .15s;
}
.act-btn:hover { background: rgba(255,255,255,.05); border-color: var(--line); color: var(--fg-hi); }
.act-ban:hover { color: var(--warn); border-color: color-mix(in oklab, var(--warn) 40%, transparent); background: color-mix(in oklab, var(--warn) 10%, transparent); }
.act-unban:hover { color: var(--ok); border-color: color-mix(in oklab, var(--ok) 40%, transparent); background: color-mix(in oklab, var(--ok) 10%, transparent); }
.act-delete:hover { color: var(--err); border-color: color-mix(in oklab, var(--err) 40%, transparent); background: color-mix(in oklab, var(--err) 10%, transparent); }

.td-empty { text-align: center; padding: 40px; color: var(--mute); font: 400 13.5px var(--font-sans); }

.loading-dots { display: flex; gap: 6px; }
.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line-2);
  animation: pulse 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }

@keyframes pulse {
  0%, 80%, 100% { opacity: .3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px;
  border-top: 1px solid var(--line);
}
.pg-btn {
  padding: 6px 14px;
  font: 500 12.5px var(--font-sans);
  color: var(--dim);
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 7px;
  cursor: pointer;
  transition: all .15s;
}
.pg-btn:hover:not(:disabled) { color: var(--fg-hi); border-color: var(--line-2); }
.pg-btn:disabled { opacity: .4; cursor: not-allowed; }
.pg-info { font: 400 12.5px var(--font-mono); color: var(--mute); }

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 420px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0,0,0,.6);
}
.modal-wide { max-width: 560px; }

.modal-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 16px;
  border-bottom: 1px solid var(--line);
}
.modal-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  flex: 0 0 36px;
}
.ban-icon { background: color-mix(in oklab, var(--warn) 15%, transparent); color: var(--warn); border: 1px solid color-mix(in oklab, var(--warn) 30%, transparent); }
.delete-icon { background: color-mix(in oklab, var(--err) 15%, transparent); color: var(--err); border: 1px solid color-mix(in oklab, var(--err) 30%, transparent); }
.proj-icon { background: var(--brand-soft); color: var(--brand); border: 1px solid color-mix(in oklab, var(--brand) 30%, transparent); }

.modal-title { font: 600 14.5px var(--font-sans); color: var(--fg-hi); margin-bottom: 2px; }
.modal-sub { font: 400 12px var(--font-mono); color: var(--mute); }
.modal-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--mute);
  cursor: pointer;
}
.modal-close:hover { background: rgba(255,255,255,.06); color: var(--fg-hi); }

.modal-body { padding: 18px; }
.field-label { display: block; font: 500 12px var(--font-sans); color: var(--dim); margin-bottom: 7px; }
.field-opt { color: var(--mute); font-weight: 400; }
.field-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  font: 400 13.5px var(--font-sans);
  color: var(--fg-hi);
  outline: none;
  transition: border-color .15s;
}
.field-input::placeholder { color: var(--mute); }
.field-input:focus { border-color: var(--line-2); }

.modal-warn {
  margin: 0;
  font: 400 13.5px/1.55 var(--font-sans);
  color: var(--dim);
  padding: 12px 14px;
  background: color-mix(in oklab, var(--err) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--err) 20%, transparent);
  border-radius: 8px;
}

.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid var(--line);
}

.btn-ghost {
  padding: 8px 16px;
  font: 500 13px var(--font-sans);
  color: var(--dim);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
}
.btn-ghost:hover { color: var(--fg-hi); border-color: var(--line-2); background: rgba(255,255,255,.03); }
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font: 500 13px var(--font-sans);
  color: #fff;
  background: var(--err);
  border: 1px solid var(--err);
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
}
.btn-danger:hover { box-shadow: 0 0 0 3px color-mix(in oklab, var(--err) 30%, transparent); }
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }

.proj-body { padding: 0; max-height: 360px; overflow-y: auto; }
.proj-body::-webkit-scrollbar { width: 6px; }
.proj-body::-webkit-scrollbar-thumb { background: var(--bg-3); border-radius: 3px; }
.proj-empty { text-align: center; padding: 32px; color: var(--mute); font: 400 13.5px var(--font-sans); }
.proj-list { display: flex; flex-direction: column; }
.proj-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
}
.proj-item:last-child { border-bottom: none; }
.proj-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.proj-name { display: inline-flex; align-items: center; gap: 5px; font: 500 13.5px var(--font-sans); color: var(--fg-hi); }
.verified-ic { color: var(--brand); flex-shrink: 0; }
.proj-slug { font: 400 11.5px var(--font-mono); color: var(--mute); }
.proj-date { font: 400 11.5px var(--font-mono); color: var(--mute); flex-shrink: 0; }

.verify-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  font: 500 11.5px var(--font-sans);
  color: var(--dim);
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
}
.verify-btn:hover:not(:disabled) { color: var(--fg-hi); border-color: var(--line-2); }
.verify-btn:disabled { opacity: .5; cursor: not-allowed; }
.verify-btn.on {
  color: var(--brand);
  background: var(--brand-soft);
  border-color: color-mix(in oklab, var(--brand) 30%, transparent);
}

.modal-enter-active { transition: opacity .18s ease, transform .18s ease; }
.modal-leave-active { transition: opacity .14s ease, transform .14s ease; }
.modal-enter-from  { opacity: 0; transform: scale(0.97); }
.modal-leave-to    { opacity: 0; transform: scale(0.97); }

@media (max-width: 640px) {
  .stat-row { flex-direction: column; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .search-wrap { max-width: none; }
}
</style>
