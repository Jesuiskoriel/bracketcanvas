import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@babel/parser'

export const sourceFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.name === 'assets' || entry.name === 'i18n' || / \d\./.test(entry.name)) return []
  const path = join(dir, entry.name)
  return entry.isDirectory() ? sourceFiles(path) : /\.(js|jsx)$/.test(path) ? [path] : []
})

export function walk(node, visitor, ancestors = []) {
  if (!node || typeof node !== 'object') return
  if (node.type) visitor(node, ancestors)
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'extra', 'comments', 'tokens'].includes(key)) continue
    if (Array.isArray(value)) value.forEach((child) => walk(child, visitor, [...ancestors, node]))
    else if (value?.type) walk(value, visitor, [...ancestors, node])
  }
}

export const jsxText = (value) => value.split(/\r?\n/).map((line, index, lines) => {
  let text = line.replace(/\t/g, ' ')
  if (index) text = text.replace(/^ +/, '')
  if (index !== lines.length - 1) text = text.replace(/ +$/, '')
  return text
}).filter(Boolean).join(' ')

if (process.argv[1]?.endsWith('i18n-inventory.mjs')) {
  const entries = new Map()
  for (const file of [...sourceFiles('src'), ...sourceFiles('server')]) {
    const code = readFileSync(file, 'utf8')
    walk(parse(code, { sourceType: 'module', plugins: ['jsx'] }), (node, ancestors) => {
      const parent = ancestors.at(-1)
      let value
      if (node.type === 'JSXText') value = jsxText(node.value)
      if (node.type === 'StringLiteral') {
        if (parent?.type === 'ImportDeclaration' || (parent?.type === 'ObjectProperty' && parent.key === node && !parent.computed)) return
        if (parent?.type === 'JSXAttribute' && !['title', 'alt', 'placeholder', 'aria-label', 'label', 'description', 'low', 'high', 'suffix'].includes(parent.name.name)) return
        value = node.value
      }
      if (node.type === 'TemplateLiteral') value = node.quasis.map((part, i) => part.value.cooked + (i < node.expressions.length ? `{${i}}` : '')).join('')
      if (!value || !/[a-zA-ZÀ-ÿ]/.test(value) || /[\n{}<>]|^\.|^\/|^https?:|^image\/|^#[0-9a-f]|^M\d|^rgba?\(|^var\(/i.test(value)) return
      if (!entries.has(value)) entries.set(value, `${file}:${node.loc.start.line}`)
    })
  }
  console.log([...entries].map(([value, file]) => `${file}\t${JSON.stringify(value)}`).join('\n'))
}
