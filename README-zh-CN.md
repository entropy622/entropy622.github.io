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

## 文章中的讲解与注释

在正文段落后插入讲解，不需要导入组件。Markdown 和 MDX 使用相同写法：

```md
> [!EXPLAIN] 为什么除以平方根
>
> 当各分量独立、均值为 0、方差为 1 时，点积的方差是 $d_k$。
> 除以 $\sqrt{d_k}$ 后，方差回到 1。
```

讲解始终展示，沿用站内的橙色强调线和明暗主题，不提供展开、收起或显示开关。标题中的行内 Markdown，以及正文里的公式、链接、列表和代码块都会保留。一般补充说明可以将 `[!EXPLAIN]` 换成 `[!NOTE]`；普通引用块不受影响。当前博客集合仍从 `content/post/` 加载 `.md` 文件。

脚注使用标准语法 `正文[^source]` 与 `[^source]: 脚注内容`，渲染后可跳转并返回正文。

《Attention Is All You Need》译注位于 `content/post/attention-is-all-you-need/index.zh-cn.md`，公式使用现有 KaTeX，五幅原图与封面保存在同一目录。

注释模块的回归测试可在 Node.js 24 下运行：

```bash
node --test src/plugins/rehype-article-notes.test.mjs
```

## 发布

向 `entropy622/entropy622.github.io` 的 `main` 分支提交即可触发 Actions：使用 Bun 安装依赖，执行检查和静态构建，再将 `dist` 发布到 GitHub Pages。

本站不提供搜索和归档页面；旧文章地址按 `src/pages` 中的规则跳转，`/search` 与 `/archives` 直接进入 404。
