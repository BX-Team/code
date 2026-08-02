import { defineCollection, defineContentConfig, z } from '@nuxt/content';

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: 'docs/**/*.md',
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
  },
});
