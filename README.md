# Entropy622 Blog

Personal site for Entropy622, built with Astro Pure and deployed as a static site to GitHub Pages.

Live site: <https://entropy622.github.io/>

## Development

```bash
npm install
npm run check
npm run build
npm run dev
```

The original Hugo posts live in `content/post/<article>/index.zh-cn.md`. The custom content loader adapts their frontmatter at build time; Markdown files are never rewritten.

`hidden: true` posts are rendered only at their explicit URL and are excluded from the home page, feeds, tags and related-post lists.

## Deployment

Push to `main` in `entropy622/entropy622.github.io`. GitHub Actions installs dependencies with Bun, runs the type check and static build, then publishes `dist` with GitHub Pages.

The site intentionally has no search or archives pages. Legacy public paths are redirected where specified in `src/pages`, while `/search` and `/archives` return the 404 page.
