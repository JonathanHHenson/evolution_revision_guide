import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import GithubSlugger from 'github-slugger'
import { toString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '../..')
const PUBLIC_DIRECTORY = path.join(REPOSITORY_ROOT, 'frontend', 'public')
const CONTENT_DIRECTORY = path.join(PUBLIC_DIRECTORY, 'content')
const MANIFEST_PATH = path.join(PUBLIC_DIRECTORY, 'content-manifest.json')

const EXCLUDED_DIRECTORIES = new Set(['frontend', '.git', 'node_modules'])
const MEDIA_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.avif',
  '.pdf',
])
const WORDS_PER_MINUTE = 200
const naturalCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
})
const markdownParser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)

function naturalCompare(left, right) {
  const comparison = naturalCollator.compare(left, right)

  if (comparison !== 0) {
    return comparison
  }

  return left < right ? -1 : left > right ? 1 : 0
}

function repositoryPath(...parts) {
  return path.join(REPOSITORY_ROOT, ...parts.flatMap((part) => part.split('/')))
}

async function discoverRepositoryFiles(relativeDirectory = '') {
  const absoluteDirectory = relativeDirectory
    ? repositoryPath(relativeDirectory)
    : REPOSITORY_ROOT
  const entries = await readdir(absoluteDirectory, { withFileTypes: true })
  const files = []

  entries.sort((left, right) => naturalCompare(left.name, right.name))

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? path.posix.join(relativeDirectory, entry.name)
      : entry.name

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        files.push(...await discoverRepositoryFiles(relativePath))
      }

      continue
    }

    if (entry.isFile()) {
      files.push(relativePath)
    }
  }

  return files
}

function routeForMarkdown(relativePath) {
  if (relativePath === 'README.md') {
    return '/'
  }

  if (path.posix.basename(relativePath) === 'README.md') {
    return `/${path.posix.dirname(relativePath)}/`
  }

  return `/${relativePath.slice(0, -path.posix.extname(relativePath).length)}/`
}

function sectionForMarkdown(relativePath) {
  const segments = relativePath.split('/')
  return segments.length === 1 ? 'root' : segments[0]
}

function normaliseWhitespace(value) {
  return value.replace(/\s+/gu, ' ').trim()
}

function extractHeadings(tree) {
  const slugger = new GithubSlugger()
  const headings = []

  visit(tree, 'heading', (node) => {
    const text = toString(node)

    headings.push({
      depth: node.depth,
      text,
      id: slugger.slug(text),
    })
  })

  return headings
}

function extractSummary(tree, firstH1) {
  const titleEnd = firstH1.position?.end.offset ?? -1
  let summary = ''

  visit(tree, 'paragraph', (node) => {
    if (summary || (node.position?.start.offset ?? 0) <= titleEnd) {
      return
    }

    const text = normaliseWhitespace(toString(node, { includeImageAlt: false }))

    if (text) {
      summary = text
    }
  })

  return summary
}

function countWords(tree) {
  const blocks = []

  visit(tree, (node) => {
    if (node.type === 'heading' || node.type === 'paragraph' || node.type === 'tableCell') {
      const text = normaliseWhitespace(toString(node, { includeImageAlt: false }))

      if (text) {
        blocks.push(text)
      }
    }
  })

  const text = normaliseWhitespace(blocks.join(' '))
  return text ? text.split(' ').length : 0
}

function inspectFeatures(tree) {
  let hasMermaid = false
  let hasMath = false

  visit(tree, (node) => {
    if (node.type === 'code' && node.lang?.toLowerCase() === 'mermaid') {
      hasMermaid = true
    }

    if (node.type === 'math' || node.type === 'inlineMath') {
      hasMath = true
    }
  })

  return { hasMermaid, hasMath }
}

async function createDocumentEntry(relativePath) {
  const source = await readFile(repositoryPath(relativePath), 'utf8')
  const tree = markdownParser.parse(source)
  const headings = extractHeadings(tree)
  let firstH1

  visit(tree, 'heading', (node) => {
    if (!firstH1 && node.depth === 1) {
      firstH1 = node
    }
  })

  if (!firstH1) {
    throw new Error(`${relativePath}: cannot build manifest entry without an H1 heading`)
  }

  const wordCount = countWords(tree)
  const { hasMermaid, hasMath } = inspectFeatures(tree)

  return {
    path: relativePath,
    route: routeForMarkdown(relativePath),
    title: toString(firstH1),
    headings,
    summary: extractSummary(tree, firstH1),
    wordCount,
    readMinutes: wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    hasMermaid,
    hasMath,
    section: sectionForMarkdown(relativePath),
  }
}

async function copyIntoContent(relativePath) {
  const destination = path.join(CONTENT_DIRECTORY, ...relativePath.split('/'))

  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(repositoryPath(relativePath), destination)
}

async function main() {
  const repositoryFiles = await discoverRepositoryFiles()
  const markdownPaths = repositoryFiles
    .filter((relativePath) => path.posix.extname(relativePath).toLowerCase() === '.md')
    .sort(naturalCompare)
  const mediaPaths = repositoryFiles
    .filter((relativePath) => MEDIA_EXTENSIONS.has(path.posix.extname(relativePath).toLowerCase()))
    .sort(naturalCompare)

  if (!repositoryFiles.includes('LICENSE')) {
    throw new Error('LICENSE: expected an extensionless repository-root licence file')
  }

  const docs = await Promise.all(markdownPaths.map(createDocumentEntry))
  docs.sort((left, right) => naturalCompare(left.path, right.path))

  const directorySet = new Set(['.'])

  for (const relativePath of markdownPaths) {
    let directory = path.posix.dirname(relativePath)

    while (directory !== '.') {
      directorySet.add(directory)
      directory = path.posix.dirname(directory)
    }
  }

  const directories = [...directorySet].sort(naturalCompare)

  const manifest = {
    version: 1,
    docs,
    directories,
  }

  await rm(CONTENT_DIRECTORY, { recursive: true, force: true })
  await mkdir(CONTENT_DIRECTORY, { recursive: true })
  await Promise.all([
    ...markdownPaths.map(copyIntoContent),
    ...mediaPaths.map(copyIntoContent),
    copyIntoContent('LICENSE'),
  ])
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  console.log(
    `Synced ${markdownPaths.length} Markdown files, ${mediaPaths.length} media files, and LICENSE; `
    + `wrote ${docs.length} manifest entries across ${directories.length} directories.`,
  )
}

main().catch((error) => {
  console.error(`Content sync failed: ${error.message}`)
  process.exitCode = 1
})
