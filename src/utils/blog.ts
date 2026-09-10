import type { CollectionEntry } from 'astro:content'

export type BlogPost = CollectionEntry<'blog'>

/** Drafts are handled by astro-pure; hidden posts are intentionally unlisted. */
export function filterPublicPosts(posts: BlogPost[]) {
  return posts.filter((post) => !post.data.hidden)
}

export function sortPublicPosts(posts: BlogPost[]) {
  return filterPublicPosts(posts).sort((a, b) => {
    const aDate = new Date(a.data.updatedDate ?? a.data.publishDate).valueOf()
    const bDate = new Date(b.data.updatedDate ?? b.data.publishDate).valueOf()
    return bDate - aDate
  })
}

