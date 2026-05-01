<script setup lang="ts">
import GithubIcon from '~/assets/external/github.svg'
import DiscordIcon from '~/assets/external/discord.svg'

type FooterLink = { label: string; href: string; external?: boolean }
type FooterColumn = { title: string; links: FooterLink[] }

const columns: FooterColumn[] = [
  {
    title: 'BX Team',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Our team', href: '/team' },
      { label: 'Status', href: 'https://status.bxteam.org', external: true },
      { label: 'Maven Repo', href: 'https://repo.bxteam.org', external: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Flags Generator', href: '/resources/flags' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Discord', href: 'https://discord.gg/qNyybSSPm5', external: true },
    ],
  },
]

const socials = [
  {
    label: 'GitHub',
    href: 'https://github.com/BX-Team',
    icon: GithubIcon,
    isImg: true,
  },
  {
    label: 'Discord',
    href: 'https://discord.gg/qNyybSSPm5',
    icon: DiscordIcon,
    isImg: true,
  },
]

const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <!-- Top: brand + columns -->
      <div class="footer-top">
        <div class="footer-brand">
          <a href="/" class="brand-row">
            <AppBrandMark />
            <span class="brand-name">BX Team</span>
          </a>
          <p class="brand-blurb">
            BX Team is an open source community that focuses on development
            and maintenance of high-quality Minecraft server software. We aim to
            provide a stable and optimized experience for both server owners
            and players.
          </p>
          <div class="brand-socials">
            <a
              v-for="s in socials"
              :key="s.label"
              :href="s.href"
              :aria-label="s.label"
              target="_blank"
              rel="noopener noreferrer"
              class="social-icon"
            >
              <img v-if="s.isImg" :src="s.icon" :alt="s.label" width="18" height="18" aria-hidden="true" class="social-svg" />
              <component v-else :is="s.icon" :size="18" :stroke-width="1.7" />
            </a>
          </div>
        </div>

        <div class="footer-cols">
          <div v-for="col in columns" :key="col.title" class="footer-col">
            <h5>{{ col.title }}</h5>
            <ul>
              <li v-for="link in col.links" :key="link.label">
                <a
                  :href="link.href"
                  :target="link.external ? '_blank' : undefined"
                  :rel="link.external ? 'noopener noreferrer' : undefined"
                >
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Bottom: copyright row -->
      <div class="footer-bottom">
        <p class="copyright">
          © {{ year }} BX Team. Not affiliated with Mojang Studios or Microsoft.
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 2;
  border-top: 1px solid var(--line);
  background: color-mix(in oklab, var(--bg-0) 92%, transparent);
}

.footer-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 56px 24px 32px;
}

.footer-top {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 2fr);
  gap: 56px;
  align-items: start;
}

/* Brand block */
.footer-brand {
  max-width: 420px;
}
.brand-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  color: var(--fg-hi);
  letter-spacing: -0.01em;
}
.brand-name {
  white-space: nowrap;
}
.brand-blurb {
  margin: 16px 0 20px;
  color: var(--mute);
  font-size: 13.5px;
  line-height: 1.6;
}
.brand-socials {
  display: flex;
  gap: 8px;
}
.social-icon {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border-radius: 8px;
  color: var(--mute);
  transition: color 0.15s, background 0.15s;
}
.social-icon:hover {
  color: var(--fg-hi);
  background: rgba(255, 255, 255, 0.05);
}
.social-svg {
  filter: brightness(0) invert(0.45);
  transition: filter 0.15s;
}
.social-icon:hover .social-svg {
  filter: brightness(0) invert(1);
}

/* Link columns */
.footer-cols {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}
.footer-col h5 {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-hi);
  letter-spacing: -0.005em;
}
.footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-col a {
  font-size: 13.5px;
  color: var(--mute);
  transition: color 0.15s;
}
.footer-col a:hover {
  color: var(--fg-hi);
}

/* Bottom row */
.footer-bottom {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.copyright {
  margin: 0;
  font-size: 12.5px;
  color: var(--mute);
}

@media (max-width: 820px) {
  .footer-inner {
    padding: 40px 20px 24px;
  }
  .footer-top {
    grid-template-columns: 1fr;
    gap: 36px;
  }
  .footer-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px;
  }
}
@media (max-width: 480px) {
  .footer-cols {
    grid-template-columns: 1fr;
  }
}
</style>
