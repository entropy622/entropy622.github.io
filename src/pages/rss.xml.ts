import type { APIRoute } from 'astro'
import rss from '@astrojs/rss'

import { getBlogCollection } from 'astro-pure/server'
import config from '@/site-config'
import { sortPublicPosts } from '@/utils/blog'

export const GET: APIRoute = async ({ site }) => {
  const posts = sortPublicPosts(await getBlogCollection())
  return rss({
    title: config.title,
    description: config.description ?? '回首空城的个人博客',
    site: site ?? import.meta.env.SITE,
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      link: `/blog/${post.id}`
    }))
  })
}
