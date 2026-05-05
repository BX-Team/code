import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  vite: {
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: [
        '@lucide/vue',
      ]
    }
  },

  modules: [
    'nuxt-umami'
  ],

  css: [
    '~/assets/css/tailwind.css',
  ],

  build: {
    transpile: ['@bx-team/ui'],
  },

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;600&display=swap' },
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
})
