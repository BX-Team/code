import { readdirSync, readFileSync } from 'node:fs';
import { PROJECTS } from '@bx-team/projects';
import tailwindcss from '@tailwindcss/vite';
import { LOCALE_COOKIE } from './locale.ts';

checkDocsAgainstRegistry();

const api = process.env.VITE_API_BASE || 'https://api.bxteam.org';
const apiBase = process.env.NODE_ENV !== 'production' && !process.env.VITE_API_BASE ? '' : api;

export default defineNuxtConfig({
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@lucide/vue'],
    },
  },

  modules: [
    '@nuxt/content',
    '@nuxt/fonts',
    '@scalar/nuxt',
    (_, nuxt) => {
      nuxt.hook('pages:extend', pages => {
        for (const page of pages) {
          if (page.path === '/docs' || page.path.startsWith('/docs/')) page.meta = { ...page.meta, i18n: false };
        }
      });
    },
    '@nuxtjs/i18n',
  ],

  i18n: {
    baseUrl: 'https://bxteam.org',
    // Messages hold literal markup like `<gradient>` and are never rendered as HTML.
    compilation: { strictMessage: false },
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: LOCALE_COOKIE,
      cookieSecure: true,
      redirectOn: 'no prefix',
    },
  },

  scalar: {
    darkMode: true,
    forceDarkModeState: 'dark',
    hideDarkModeToggle: true,
    hideClientButton: true,
    agent: { disabled: true },
    mcp: { disabled: true },
    customCss: readFileSync(new URL('./app/assets/css/scalar.css', import.meta.url), 'utf8'),
    pathRouting: { basePath: '/docs/api' },
    url: `${apiBase}/v1/openapi.json`,
  },

  fonts: {
    families: [
      {
        name: 'Inter',
        provider: 'google',
        weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        styles: ['normal', 'italic'],
      },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 600] },
    ],
  },

  css: ['~/assets/css/tailwind.css', '~/assets/css/bxid.css'],

  build: {
    transpile: ['@bx-team/ui'],
  },

  content: {
    build: {
      markdown: {
        highlight: {
          theme: 'github-dark',
          langs: [
            'bash',
            'shell',
            'sh',
            'zsh',
            'bat',
            'powershell',
            'yaml',
            'json',
            'jsonc',
            'toml',
            'js',
            'ts',
            'jsx',
            'tsx',
            'vue',
            'vue-html',
            'html',
            'css',
            'scss',
            'java',
            'kotlin',
            'groovy',
            'docker',
            'ini',
            'diff',
            'md',
            'xml',
            'log',
          ],
        },
      },
    },
  },

  app: {
    head: {
      titleTemplate: '%s | BX Team',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      ],
      meta: [
        {
          name: 'description',
          content:
            'BX Team is an open source community building tools and software that empower Minecraft server owners, developers, and players',
        },
        {
          name: 'keywords',
          content: 'BX Team, Minecraft, server software, plugins, mods, downloads, documentation',
        },
      ],
    },
  },

  routeRules: {
    '/docs/api/**': { ssr: false },
    ...localized({
      '/downloads/**': { ssr: false },
      // Each tool restores its form from the query string, which a prerendered page cannot know.
      '/tools/*': { ssr: false },
      // The session lives in a cookie on the id Worker's host, which only the browser can send.
      '/login': { ssr: false },
      '/account': { ssr: false },
      '/account/**': { ssr: false },
    }),
  },

  sourcemap: { server: false },

  nitro: {
    preset: 'static',

    prerender: { routes: ['/', '/ru'] },

    devProxy: {
      '/v1': { target: `${api}/v1`, changeOrigin: true },
      '/gh': {
        target: 'https://api.github.com',
        changeOrigin: true,
        headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
      },
    },
  },

  compatibilityDate: '2026-01-01',

  future: { compatibilityVersion: 5 },

  experimental: {
    // @nuxt/content still imports useRuntimeConfig from #imports; drop once it supports Nuxt 5.
    nitroAutoImports: true,
  },
});

/** The same rules for the English pages and their Russian copies under /ru. */
function localized<T>(rules: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(rules).flatMap(([path, rule]) => [
      [path, rule],
      [`/ru${path}`, rule],
    ]),
  );
}

/** A docs section and a registry entry are the same fact twice; fail the build when they drift. */
function checkDocsAgainstRegistry() {
  const sections = readdirSync(new URL('./content/docs', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name.replace(/^\d+\./, ''));
  const registered = PROJECTS.filter(project => project.docs).map(project => project.key);

  const unregistered = sections.filter(key => !registered.includes(key));
  const missing = registered.filter(key => !sections.includes(key));
  if (unregistered.length || missing.length) {
    throw new Error(
      `Docs and @bx-team/projects disagree — without \`docs: true\`: ${unregistered.join(', ') || 'none'}; without a docs section: ${missing.join(', ') || 'none'}`,
    );
  }
}
