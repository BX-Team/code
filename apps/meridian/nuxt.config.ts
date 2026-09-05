import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';

const api = process.env.VITE_API_BASE || 'https://api.bxteam.org';
const apiBase = process.env.NODE_ENV !== 'production' && !process.env.VITE_API_BASE ? '' : api;

export default defineNuxtConfig({
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@lucide/vue'],
    },
  },

  modules: ['@nuxt/content', '@nuxt/fonts', '@scalar/nuxt'],

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

  css: ['~/assets/css/tailwind.css'],

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
    '/downloads/**': { ssr: false },
    '/docs/api/**': { ssr: false },
  },

  sourcemap: { server: false },

  nitro: {
    preset: 'static',

    // Dev only — the generated site has no server, and in production the browser
    // talks to azimuth directly from an origin that Worker allows.
    devProxy: {
      '/v1': { target: `${api}/v1`, changeOrigin: true },
    },
  },

  compatibilityDate: '2026-01-01',
});
