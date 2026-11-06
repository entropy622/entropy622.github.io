import type { Element, ElementContent, Root } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import { visit } from 'unist-util-visit'

const labels = { EXPLAIN: '讲解', NOTE: '注释' } as const

function splitFirstLine(children: ElementContent[]) {
  const title: ElementContent[] = []
  const body: ElementContent[] = []
  let inBody = false

  for (const child of children) {
    if (!inBody && child.type === 'text' && child.value.includes('\n')) {
      const newline = child.value.indexOf('\n')
      if (newline) title.push({ ...child, value: child.value.slice(0, newline) })
      if (newline < child.value.length - 1) {
        body.push({ ...child, value: child.value.slice(newline + 1) })
      }
      inBody = true
    } else {
      ;(inBody ? body : title).push(child)
    }
  }

  return { title, body }
}

/** Always-visible reading notes, shared by the Markdown and MDX pipelines. */
export default function rehypeArticleNotes() {
  return (tree: Root) => {
    const ids = new Set<string>()
    let sequence = 0
    visit(tree, 'element', (node: Element) => {
      if (typeof node.properties.id === 'string') ids.add(node.properties.id)
    })
    // Markdown's raw HTML is parsed after user plugins; reserve its anchors too.
    visit(tree, 'raw', (node) => {
      visit(fromHtml(node.value, { fragment: true }), 'element', (element) => {
        if (typeof element.properties.id === 'string') ids.add(element.properties.id)
      })
    })

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'blockquote') return
      const firstIndex = node.children.findIndex((child) => child.type === 'element')
      const first = node.children[firstIndex]
      if (first?.type !== 'element' || first.tagName !== 'p' || first.children[0]?.type !== 'text')
        return

      const marker = first.children[0].value.match(/^\[!(EXPLAIN|NOTE)\](?:[ \t]+|(?=\n|$))/)
      if (!marker) return

      const kind = marker[1] as keyof typeof labels
      const label = labels[kind]
      const children = [
        { ...first.children[0], value: first.children[0].value.slice(marker[0].length) },
        ...first.children.slice(1)
      ]
      const { title, body } = splitFirstLine(children)
      if (!title.some((child) => child.type !== 'text' || child.value.trim())) {
        title.push({ type: 'text', value: '补充说明' })
      }

      let id: string
      do id = `article-note-${++sequence}`
      while (ids.has(id) || ids.has(`${id}-title`))
      ids.add(id)
      ids.add(`${id}-title`)

      const content: ElementContent[] = node.children.slice(firstIndex + 1)
      if (body.length) content.unshift({ ...first, children: body })

      node.tagName = 'aside'
      node.properties = {
        ...node.properties,
        id,
        className: ['article-note'],
        dataNoteKind: kind.toLowerCase(),
        ariaLabelledBy: [`${id}-title`]
      }
      node.children = [
        {
          type: 'element',
          tagName: 'div',
          properties: { className: ['article-note-heading'], id: `${id}-title` },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { className: ['article-note-label'] },
              children: [{ type: 'text', value: label }]
            },
            {
              type: 'element',
              tagName: 'span',
              properties: { className: ['article-note-title'] },
              children: title
            }
          ]
        },
        {
          type: 'element',
          tagName: 'div',
          properties: { className: ['article-note-body'] },
          children: content
        }
      ]
    })
  }
}
