import type { CollectionEntry } from 'astro:content'

export type BlogPost = CollectionEntry<'blog'>

/** Drafts are handled by astro-pure; hidden posts are intentionally unlisted. */
export function filterPublicPosts(posts: BlogPost[]) {
  return posts.filter((post) => !post.data.hidden)
}

export type PostKind = 'tech' | 'daily'

/** Tags that file a post under 技术笔记; everything else reads as 日常. */
const TECH_TAGS = new Set([
  'ai', 'transformer', '论文阅读', 'opengl', '笔记', 'catlike coding', 'unity', 'react', 'shader', 'unreal', 'web', '图形学'
])

export const postKindLabel: Record<PostKind, string> = { tech: '技术笔记', daily: '日常' }

export function postKind(post: BlogPost): PostKind {
  return post.data.tags.some((tag) => TECH_TAGS.has(tag)) ? 'tech' : 'daily'
}

export function sortPublicPosts(posts: BlogPost[]) {
  return filterPublicPosts(posts).sort((a, b) => {
    const aDate = new Date(a.data.updatedDate ?? a.data.publishDate).valueOf()
    const bDate = new Date(b.data.updatedDate ?? b.data.publishDate).valueOf()
    return bDate - aDate
  })
}

