import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@lucide/vue'],
    },
  },

  modules: ['@nuxt/content', '@nuxt/fonts'],

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

  css: ['~/assets/css/tailwind.css', 'vue-sonner/style.css'],

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
          content: 'Pulsify, BX Team, Minecraft, observability, analytics, plugins, mods, error tracking',
        },
      ],
    },
  },

  routeRules: {
    '/dashboard/**': { ssr: false },
    '/admin/**': { ssr: false },
    '/downloads/**': { ssr: false },
    '/login': { ssr: false },
  },

  nitro: {
    preset: 'static',
  },

  compatibilityDate: '2026-01-01',
});
