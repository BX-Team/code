import { defineCollection, defineContentConfig, z } from '@nuxt/content';

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: {
        repository: {
          url: 'https://github.com/BX-Team/docs',
          branch: 'master',
        },
        include: 'docs/**',
      },
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        badge: z.string().optional(),
      }),
    }),
    legal: defineCollection({
      type: 'page',
      source: 'legal/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        lastUpdated: z.string().optional(),
      }),
    }),
    roadmap: defineCollection({
      type: 'page',
      source: 'roadmap/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string(),
        icon: z.string(),
        accent: z.string().optional(),
        order: z.number(),
        blurb: z.string(),
        items: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            status: z.enum(['planned', 'progress', 'review', 'shipped']),
            progress: z.number().optional(),
            description: z.string().optional(),
          }),
        ),
      }),
    }),
  },
});
