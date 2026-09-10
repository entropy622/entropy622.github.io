# Entropy622 个人博客

这是 Entropy622 的个人网站，使用 Astro Pure 静态构建，并通过 GitHub Pages 发布。

站点地址：<https://entropy622.github.io/>

## 本地开发

```bash
npm install
npm run check
npm run build
npm run dev
```

原 Hugo 文章保留在 `content/post/<文章目录>/index.zh-cn.md`。自定义内容加载器只在构建时适配 frontmatter，Markdown 文件本身不会被回写或格式化。

带有 `hidden: true` 的文章仍然生成独立页面，但不会出现在首页、文章列表、标签、RSS 或相关文章中。

## 发布

向 `entropy622/entropy622.github.io` 的 `main` 分支提交即可触发 Actions：使用 Bun 安装依赖，执行检查和静态构建，再将 `dist` 发布到 GitHub Pages。

本站不提供搜索和归档页面；旧文章地址按 `src/pages` 中的规则跳转，`/search` 与 `/archives` 直接进入 404。
