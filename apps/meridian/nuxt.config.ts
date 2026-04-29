import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  css: [
    '~/assets/css/tailwind.css',
  ],

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  modules: [
    'shadcn-nuxt',
  ],

  shadcn: {
    prefix: 'Ui',
    componentDir: '@/components/ui',
  },

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap' },
      ],
    },
  },

  runtimeConfig: {
    apiSecretKey: process.env.API_SECRET_KEY || '',
    r2PublicUrl: process.env.R2_PUBLIC_URL || '',
  },

  nitro: {
    preset: 'bun',
  },

  compatibilityDate: '2025-01-01',
})
