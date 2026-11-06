import assert from 'node:assert/strict'
import test from 'node:test'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import { compile } from '@mdx-js/mdx'
import { parse } from 'node-html-parser'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

import rehypeArticleNotes from './rehype-article-notes.ts'

const processor = await createMarkdownProcessor({
  syntaxHighlight: false,
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex, rehypeArticleNotes]
})
const render = async (markdown) => parse((await processor.render(markdown)).code)

test('lecture notes are always visible, with a rich title and intact Markdown body', async () => {
  const root = await render(`> [!EXPLAIN] **Q 与 K** 怎样匹配
>
> 读取 $d_k$ 维向量与 [论文](https://arxiv.org/abs/1706.03762)。
>
> - 保留列表
> - 保留第二项
>
> \`\`\`js
> const head = 8
> \`\`\``)
  const note = root.querySelector('aside.article-note')
  assert.equal(root.querySelectorAll('details, summary, button').length, 0)
  assert.equal(note.getAttribute('data-note-kind'), 'explain')
  assert.equal(note.querySelector('.article-note-heading strong').text, 'Q 与 K')
  assert.equal(note.getAttribute('aria-labelledby'), note.querySelector('.article-note-heading').id)
  assert.equal(note.querySelector('.article-note-label').text, '讲解')
  assert.ok(note.querySelector('.article-note-body .katex'))
  assert.equal(
    note.querySelector('.article-note-body a').getAttribute('href'),
    'https://arxiv.org/abs/1706.03762'
  )
  assert.equal(note.querySelectorAll('li').length, 2)
  assert.match(note.querySelector('pre').text, /const head = 8/)
  assert.doesNotMatch(note.text, /\[!EXPLAIN\]/)
})

test('marker without a blank line keeps the following paragraph, and a missing title gets a label', async () => {
  const root = await render('> [!NOTE]\n> 正文第一行。\n> 正文第二行。')
  assert.equal(root.querySelector('.article-note-title').text, '补充说明')
  assert.match(root.querySelector('.article-note-body').text, /正文第一行。\n正文第二行。/)
})

test('both note kinds are visible and receive distinct anchor IDs', async () => {
  const root = await render(
    '> [!NOTE] 参考文献\n>\n> 保留文献。\n\n> [!EXPLAIN] 计算过程\n>\n> 保留解释。'
  )
  const notes = root.querySelectorAll('aside')
  assert.equal(notes[0].querySelector('.article-note-label').text, '注释')
  assert.equal(notes[1].querySelector('.article-note-label').text, '讲解')
  assert.notEqual(notes[0].id, notes[1].id)
})

test('ordinary quotes, unknown markers, and quoted inline text retain their original rendering', async () => {
  const root = await render(
    '> 一段普通引用。\n\n> [!WARNING] 原有标记\n\n> 中间的 [!NOTE] 只是文字。\n\n> [!NOTE]wrong 不符合语法。'
  )
  assert.equal(root.querySelectorAll('aside.article-note').length, 0)
  assert.equal(root.querySelectorAll('blockquote').length, 4)
})

test('a marker after a code block does not turn an ordinary quote into a note', async () => {
  const root = await render(
    '> ```js\n> const keep = true\n> ```\n>\n> [!NOTE] 此处是引用中的文字。'
  )
  assert.equal(root.querySelectorAll('aside.article-note').length, 0)
  assert.equal(root.querySelectorAll('blockquote').length, 1)
  assert.match(root.querySelector('blockquote pre').text, /const keep = true/)
  assert.match(root.querySelector('blockquote').text, /\[!NOTE\]/)
})

test('nested notes retain content and do not collide with existing anchor IDs', async () => {
  const root = await render(
    '<p id="article-note-1">已有锚点</p>\n\n> [!EXPLAIN] 外层\n>\n> 外层内容。\n>\n> > [!NOTE] 内层\n> >\n> > 内层内容。'
  )
  const notes = root.querySelectorAll('aside')
  assert.equal(notes.length, 2)
  assert.deepEqual(
    notes.map((note) => note.id),
    ['article-note-2', 'article-note-3']
  )
  assert.match(notes[1].text, /内层内容/)
})

test('lecture titles stay out of the TOC, while native footnotes keep return links', async () => {
  const result = await processor.render(
    '## 正文\n\n> [!EXPLAIN] 讲解标题\n>\n> 附加解释。\n\n原文脚注[^source]。\n\n[^source]: 脚注内容。'
  )
  assert.ok(result.metadata.headings.some((heading) => heading.text === '正文'))
  assert.ok(!result.metadata.headings.some((heading) => heading.text === '讲解标题'))
  const root = parse(result.code)
  assert.ok(root.querySelector('a[data-footnote-ref]'))
  assert.ok(root.querySelector('a[data-footnote-backref]'))
})

test('the same plugin compiles visible notes in MDX without component imports', async () => {
  const result = String(
    await compile('> [!EXPLAIN] MDX 讲解\n>\n> 保留 **重点** 与 $d_k$。', {
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex, rehypeArticleNotes]
    })
  )
  assert.match(result, /article-note/)
  assert.match(result, /aside/)
  assert.doesNotMatch(result, /summary/)
  assert.match(result, /讲解/)
  assert.match(result, /katex/)
  assert.doesNotMatch(result, /\[!EXPLAIN\]/)
})
