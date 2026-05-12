import { spawnSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';

function getGitCommit(): { hash: string; message: string } {
  const run = (args: string[]) => spawnSync('git', args, { encoding: 'utf-8' }).stdout?.trim() ?? '';
  try {
    const hash = run(['log', '-1', '--format=%h']);
    const message = run(['log', '-1', '--format=%s']);
    if (!hash) return { hash: 'unknown', message: '' };
    return { hash, message };
  } catch {
    return { hash: 'unknown', message: '' };
  }
}

export default defineNuxtConfig({
  appConfig: {
    commit: getGitCommit(),
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@lucide/vue'],
    },
  },

  modules: ['@nuxt/content', '@nuxt/fonts', 'nuxt-umami'],

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
          content: 'Pulsify, BX Team, Minecraft, observability, analytics, plugins, mods, error tracking',
        },
      ],
    },
  },

  umami: {
    id: '73b3992f-6a02-4cbd-a0d5-937aa585b8ae',
    host: 'https://analytics.bxteam.org',
    autoTrack: true,
  },

  runtimeConfig: {
    apiSecretKey: process.env.API_SECRET_KEY || '',
    r2PublicUrl: process.env.R2_PUBLIC_URL || '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    r2Endpoint: process.env.R2_ENDPOINT || '',
    r2Bucket: process.env.R2_BUCKET || '',
  },

  compatibilityDate: '2025-01-01',
});
