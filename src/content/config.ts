import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    type: 'content',
    // Type-check frontmatter using a schema
    schema: z.object({
        title: z.string(),
        description: z.string(),
        // Defaults to the site owner so every post carries a byline without
        // needing per-file frontmatter; override in frontmatter for guests.
        author: z.string().default('Simon Kurgan'),
        // Transform string to Date object
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.string().optional(),
        tags: z.array(z.string()).optional(),
        draft: z.boolean().optional(),
    }),
});

export const collections = { blog };
