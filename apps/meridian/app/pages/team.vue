<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TeamMember {
  name: string
  role: string
  github?: string
}

interface TeamSection {
  title: string
  description: string
  members: TeamMember[]
}

interface GithubContributor {
  login: string
  html_url: string
  avatar_url: string
  contributions: number
  type: string
}

const sections: TeamSection[] = [
  {
    title: 'Leadership Team',
    description: 'The main team that leads the projects and makes strategic decisions.',
    members: [
      { name: 'NONPLAYT', github: 'NONPLAYT', role: 'Founder' },
      { name: 'wiyba', github: 'wiyba', role: 'Developer' },
      { name: 'Thoutpinqq', github: 'VladKekes', role: 'Co-Founder' },
    ],
  },
  {
    title: 'Other members',
    description: 'The team responsible for the moderation and management of the projects.',
    members: [
      { name: 'ROUMAY', role: 'Discord Moderator' },
      { name: 'p4ts4k', github: 'P4TS4KK', role: 'Task Manager' },
    ],
  },
]

const REPOS = ['DivineMC', 'NDailyRewards', 'Quark', 'run-server-plugin', 'website']

const { data: contributors } = await useAsyncData<GithubContributor[]>(
  'team:contributors',
  async () => {
    try {
      const results = await Promise.all(
        REPOS.map(repo =>
          $fetch<GithubContributor[]>(`https://api.github.com/repos/BX-Team/${repo}/contributors?per_page=100`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
          }).catch(() => [] as GithubContributor[]),
        ),
      )
      const merged = results.flat().reduce(
        (acc, c) => {
          if (c.type !== 'User') return acc
          acc[c.login] = { ...c, contributions: (acc[c.login]?.contributions ?? 0) + c.contributions }
          return acc
        },
        {} as Record<string, GithubContributor>,
      )
      return Object.values(merged).sort(
        (a, b) => b.contributions - a.contributions || a.login.localeCompare(b.login),
      )
    } catch {
      return []
    }
  },
  { default: () => [] as GithubContributor[] },
)

useHead({
  title: 'Team | BX Team',
  meta: [{ name: 'description', content: 'Meet the BX Team developers and contributors.' }],
})
</script>

<template>
  <PageShell>
    <div class="page-wrap">
      <header class="page-head">
        <h1>Meet our team</h1>
        <p>
          BX Team is a group of developers and contributors who work together to
          maintain and improve the BX Team projects.
        </p>
        <Button as="a" href="https://github.com/BX-Team" target="_blank" rel="noopener noreferrer" variant="default">
          <img src="~/assets/external/github.svg" width="16" height="16" alt="" aria-hidden="true" />
          Visit our GitHub
        </Button>
      </header>

      <section v-for="s in sections" :key="s.title" class="team-section">
        <h2>{{ s.title }}</h2>
        <p class="section-desc">{{ s.description }}</p>
        <div class="member-grid">
          <component
            :is="m.github ? 'a' : 'div'"
            v-for="m in s.members"
            :key="m.name"
            :href="m.github ? `https://github.com/${m.github}` : undefined"
            :target="m.github ? '_blank' : undefined"
            :rel="m.github ? 'noopener noreferrer' : undefined"
            class="member-card"
          >
            <Avatar class="size-11 shrink-0">
              <AvatarImage v-if="m.github" :src="`https://github.com/${m.github}.png`" :alt="`${m.name} avatar`" />
              <AvatarFallback>{{ m.name[0] }}</AvatarFallback>
            </Avatar>
            <div>
              <h3>{{ m.name }}</h3>
              <p>{{ m.role }}</p>
            </div>
          </component>
        </div>
      </section>

      <section class="team-section">
        <h2>Contributors</h2>
        <p class="section-desc">
          Our amazing contributors who help make BX Team projects better and better.
        </p>
        <div class="contributors">
          <a
            v-for="c in contributors"
            :key="c.login"
            :href="c.html_url"
            target="_blank"
            rel="noopener noreferrer"
            class="contrib"
          >
            <Avatar class="size-14">
              <AvatarImage :src="c.avatar_url" :alt="`${c.login} GitHub avatar`" />
              <AvatarFallback>{{ c.login[0] }}</AvatarFallback>
            </Avatar>
          </a>
        </div>
      </section>
    </div>
  </PageShell>
</template>

<style scoped>
.page-wrap { max-width: 1180px; margin: 0 auto; padding: 90px 24px 80px; }
.page-head { max-width: 720px; margin: 0 auto 56px; text-align: center; }
.page-head h1 {
  font-size: clamp(36px, 5vw, 52px);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.05;
  color: var(--fg-hi);
  margin: 0 0 18px;
}
.page-head p { color: var(--dim); font-size: 17px; margin: 0 0 24px; }

.team-section { margin-top: 56px; }
.team-section h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--fg-hi);
  margin: 0 0 6px;
}
.section-desc { color: var(--dim); margin: 0 0 24px; font-size: 14.5px; }

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.member-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: oklch(0.16 0.006 240 / .6);
  text-decoration: none;
  color: inherit;
  transition: border-color .15s, background .15s, transform .15s;
}
a.member-card:hover {
  border-color: var(--line-2);
  background: oklch(0.18 0.006 240 / .8);
  transform: translateY(-1px);
}
.member-card h3 {
  margin: 0 0 2px;
  font-size: 14px; font-weight: 600;
  color: var(--fg-hi);
}
.member-card p { margin: 0; color: var(--mute); font-size: 13px; }

.contributors { display: flex; flex-wrap: wrap; gap: 12px; }
.contrib { transition: transform .15s; }
.contrib:hover { transform: translateY(-2px); }
</style>
