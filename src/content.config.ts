import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'

import { hugoPostsLoader } from './content/loaders/hugo-posts'

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array
  const lowercaseItems = array.map((str) => str.toLowerCase())
  const distinctItems = new Set(lowercaseItems)
  return Array.from(distinctItems)
}

const blog = defineCollection({
  loader: hugoPostsLoader,
  schema: () =>
    z.object({
      title: z.string().max(120),
      description: z.string().max(160),
      date: z.coerce.date().optional(),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      image: z.string().optional(),
      tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
      language: z.string().optional(),
      draft: z.boolean().default(false),
      hidden: z.boolean().default(false),
      comment: z.boolean().default(false),
      comments: z.boolean().optional(),
      slug: z.string().optional(),
      _build: z.record(z.string(), z.unknown()).optional(),
      heroImage: z
        .object({
          src: z.string(),
          alt: z.string().optional(),
          color: z.string().optional()
        })
        .optional()
    })
})

export const collections = { blog }
