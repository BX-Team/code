import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
	collections: {
		docs: defineCollection({
			type: 'page',
			source: {
			  repository: {
          url: 'https://github.com/BX-Team/docs',
          branch: 'master'
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
	},
})
