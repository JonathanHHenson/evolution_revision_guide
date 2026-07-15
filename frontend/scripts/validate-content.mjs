import { readFile, readdir } from 'node:fs/promises'
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
const EXCLUDED_DIRECTORIES = new Set(['frontend', '.git', 'node_modules'])
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel'])
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

function repositoryPath(relativePath) {
  return path.join(REPOSITORY_ROOT, ...relativePath.split('/'))
}

async function discoverRepository(relativeDirectory = '', result = undefined) {
  const discovered = result ?? {
    files: new Set(),
    directories: new Set(['.']),
  }
  const absoluteDirectory = relativeDirectory
    ? repositoryPath(relativeDirectory)
    : REPOSITORY_ROOT
  const entries = await readdir(absoluteDirectory, { withFileTypes: true })

  entries.sort((left, right) => naturalCompare(left.name, right.name))

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? path.posix.join(relativeDirectory, entry.name)
      : entry.name

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        discovered.directories.add(relativePath)
        await discoverRepository(relativePath, discovered)
      }

      continue
    }

    if (entry.isFile()) {
      discovered.files.add(relativePath)
    }
  }

  return discovered
}

function buildCaseIndex(paths) {
  const index = new Map()

  for (const relativePath of paths) {
    const key = relativePath.toLowerCase()
    const matches = index.get(key) ?? []
    matches.push(relativePath)
    index.set(key, matches)
  }

  return index
}

function extractHeadingIds(tree) {
  const slugger = new GithubSlugger()
  const headings = []

  visit(tree, 'heading', (node) => {
    const text = toString(node)
    headings.push({ text, id: slugger.slug(text) })
  })

  return headings
}

function extractDefinitions(tree) {
  const definitions = new Map()

  visit(tree, 'definition', (node) => {
    if (!definitions.has(node.identifier)) {
      definitions.set(node.identifier, node)
    }
  })

  return definitions
}

async function parseDocument(relativePath) {
  const source = await readFile(repositoryPath(relativePath), 'utf8')
  const tree = markdownParser.parse(source)
  const headings = extractHeadingIds(tree)

  return {
    path: relativePath,
    tree,
    headings,
    headingIds: new Set(headings.map((heading) => heading.id)),
    definitions: extractDefinitions(tree),
  }
}

function sourceLocation(relativePath, position) {
  const line = position?.start?.line ?? position?.line ?? 1
  const column = position?.start?.column ?? position?.column ?? 1
  return `${relativePath}:${line}:${column}`
}

function quote(value) {
  return JSON.stringify(value)
}

function decodePath(rawPath) {
  if (rawPath.includes('\\')) {
    throw new Error('uses a backslash; use POSIX "/" separators')
  }

  const decodedSegments = rawPath.split('/').map((segment) => {
    let decoded

    try {
      decoded = decodeURIComponent(segment)
    } catch {
      throw new Error('contains malformed percent-encoding')
    }

    if (decoded.includes('/') || decoded.includes('\\')) {
      throw new Error('contains an encoded path separator')
    }

    if (decoded.includes('\0')) {
      throw new Error('contains a null byte')
    }

    return decoded
  })

  return decodedSegments.join('/')
}

function parseLocalDestination(url) {
  const hashIndex = url.indexOf('#')
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const rawFragment = hashIndex === -1 ? undefined : url.slice(hashIndex + 1)
  const queryIndex = beforeHash.indexOf('?')
  const rawPath = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex)
  let fragment

  if (rawFragment !== undefined) {
    try {
      fragment = decodeURIComponent(rawFragment)
    } catch {
      throw new Error('contains malformed percent-encoding in its fragment')
    }
  }

  const targetPath = decodePath(rawPath)

  return {
    targetPath,
    directoryHint: targetPath.endsWith('/'),
    hasQuery: queryIndex !== -1,
    fragment,
  }
}

function resolveRepositoryTarget(sourcePath, targetPath) {
  if (targetPath === '') {
    return sourcePath
  }

  const rootRelative = targetPath.startsWith('/')
  const candidate = rootRelative
    ? targetPath.replace(/^\/+/, '') || '.'
    : path.posix.join(path.posix.dirname(sourcePath), targetPath)
  const normalised = path.posix.normalize(candidate)

  if (
    normalised === '..'
    || normalised.startsWith('../')
    || path.posix.isAbsolute(normalised)
  ) {
    throw new Error('escapes the repository root')
  }

  return normalised.replace(/\/+$/u, '') || '.'
}

function classifyDestination(url, isImage) {
  if (url.startsWith('//')) {
    return isImage
      ? { error: 'remote image embeds are not allowed; use a repository-local asset' }
      : { external: true }
  }

  const protocolMatch = /^([A-Za-z][A-Za-z\d+.-]*):/.exec(url)

  if (!protocolMatch) {
    return { external: false }
  }

  const protocol = protocolMatch[1].toLowerCase()

  if (isImage) {
    return {
      error: `image embeds must be repository-local; found the ${quote(`${protocol}:`)} protocol`,
    }
  }

  if (ALLOWED_EXTERNAL_PROTOCOLS.has(protocol)) {
    return { external: true }
  }

  return {
    error: `unsupported link protocol ${quote(`${protocol}:`)}; allowed external protocols are http, https, mailto, and tel`,
  }
}

function preserveCommentOffsets(html) {
  return html.replace(/<!--[\s\S]*?-->/gu, (comment) => comment.replace(/[^\n]/gu, ' '))
}

function decodeHtmlEntities(value) {
  return value.replace(
    /&(#(?:x[\dA-F]+|\d+)|amp|quot|apos|lt|gt);/giu,
    (entity, body) => {
      const lowerBody = body.toLowerCase()

      if (lowerBody === 'amp') return '&'
      if (lowerBody === 'quot') return '"'
      if (lowerBody === 'apos') return "'"
      if (lowerBody === 'lt') return '<'
      if (lowerBody === 'gt') return '>'

      const hexadecimal = lowerBody.startsWith('#x')
      const numberText = body.slice(hexadecimal ? 2 : 1)
      const codePoint = Number.parseInt(numberText, hexadecimal ? 16 : 10)

      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return entity
      }
    },
  )
}

function positionWithinHtml(node, offset) {
  const start = node.position?.start ?? { line: 1, column: 1 }
  const before = node.value.slice(0, offset)
  const lines = before.split('\n')

  return {
    line: start.line + lines.length - 1,
    column: lines.length === 1
      ? start.column + offset
      : lines[lines.length - 1].length + 1,
  }
}

function htmlDestinations(node) {
  const html = preserveCommentOffsets(node.value)
  const destinations = []
  const tagPattern = /<(a|img)\b[^>]*>/giu
  let tagMatch

  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const tagName = tagMatch[1].toLowerCase()
    const attributeName = tagName === 'img' ? 'src' : 'href'
    const attributePattern = new RegExp(
      `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
      'iu',
    )
    const attributeMatch = attributePattern.exec(tagMatch[0])

    if (!attributeMatch) {
      continue
    }

    const rawValue = attributeMatch[1] ?? attributeMatch[2] ?? attributeMatch[3] ?? ''
    const valueOffset = attributeMatch.index + attributeMatch[0].indexOf(rawValue)

    destinations.push({
      url: decodeHtmlEntities(rawValue),
      isImage: tagName === 'img',
      position: positionWithinHtml(node, tagMatch.index + valueOffset),
    })
  }

  return destinations
}

function validateDocuments(documents, discovered) {
  const errors = []
  const fileCaseIndex = buildCaseIndex(discovered.files)
  const directoryCaseIndex = buildCaseIndex(discovered.directories)
  const stats = {
    localLinks: 0,
    localImages: 0,
    headingFragments: 0,
  }

  function report(document, position, message) {
    errors.push(`${sourceLocation(document.path, position)}: ${message}`)
  }

  function caseMismatch(target) {
    return [
      ...(fileCaseIndex.get(target.toLowerCase()) ?? []),
      ...(directoryCaseIndex.get(target.toLowerCase()) ?? []),
    ].filter((match) => match !== target)
  }

  function validateHeadingFragment(document, position, url, markdownPath, fragment) {
    if (fragment === undefined || fragment === '') {
      return
    }

    stats.headingFragments += 1
    const targetDocument = documents.get(markdownPath)

    if (!targetDocument) {
      report(
        document,
        position,
        `link target ${quote(url)} cannot check fragment ${quote(`#${fragment}`)} because ${quote(markdownPath)} is not parsed Markdown`,
      )
      return
    }

    if (targetDocument.headingIds.has(fragment)) {
      return
    }

    const caseSuggestion = targetDocument.headings.find(
      (heading) => heading.id.toLowerCase() === fragment.toLowerCase(),
    )
    const suggestion = caseSuggestion
      ? `; did you mean ${quote(`#${caseSuggestion.id}`)}?`
      : '; check the heading text and its GitHub-generated ID'

    report(
      document,
      position,
      `link target ${quote(url)} has no heading ${quote(`#${fragment}`)} in ${quote(markdownPath)}${suggestion}`,
    )
  }

  function validateDestination(document, position, url, isImage) {
    const label = isImage ? 'image' : 'link'
    const classification = classifyDestination(url, isImage)

    if (classification.error) {
      report(document, position, `${label} target ${quote(url)}: ${classification.error}`)
      return
    }

    if (classification.external) {
      return
    }

    if (isImage) {
      stats.localImages += 1
    } else {
      stats.localLinks += 1
    }

    let parsed
    let target

    try {
      parsed = parseLocalDestination(url)
      target = resolveRepositoryTarget(document.path, parsed.targetPath)
    } catch (error) {
      report(document, position, `${label} target ${quote(url)} ${error.message}`)
      return
    }

    if (discovered.files.has(target)) {
      if (parsed.directoryHint) {
        report(
          document,
          position,
          `${label} target ${quote(url)} uses a trailing slash but resolves to file ${quote(target)}`,
        )
        return
      }

      if (!isImage && path.posix.extname(target).toLowerCase() === '.md') {
        if (parsed.hasQuery) {
          report(document, position, `link target ${quote(url)} uses a query on a Markdown page; hash-routed pages support heading fragments but not local queries`)
          return
        }
        validateHeadingFragment(document, position, url, target, parsed.fragment)
      }

      return
    }

    if (discovered.directories.has(target)) {
      if (isImage) {
        report(document, position, `image target ${quote(url)} resolves to directory ${quote(target)}`)
        return
      }

      if (parsed.hasQuery) {
        report(document, position, `link target ${quote(url)} uses a query on a Markdown folder route; hash-routed pages do not support local queries`)
        return
      }

      if (parsed.fragment !== undefined && parsed.fragment !== '') {
        const readmePath = target === '.' ? 'README.md' : path.posix.join(target, 'README.md')

        if (!discovered.files.has(readmePath)) {
          const readmeCaseMatches = fileCaseIndex.get(readmePath.toLowerCase()) ?? []
          const detail = readmeCaseMatches.length > 0
            ? `; case mismatch, expected ${readmeCaseMatches.map(quote).join(' or ')}`
            : '; add README.md or link directly to a Markdown file'

          report(
            document,
            position,
            `link target ${quote(url)} resolves to directory ${quote(target)}, but its fragment has no Markdown document to target${detail}`,
          )
          return
        }

        validateHeadingFragment(document, position, url, readmePath, parsed.fragment)
      }

      return
    }

    const caseMatches = caseMismatch(target)

    if (caseMatches.length > 0) {
      report(
        document,
        position,
        `${label} target ${quote(url)} resolves with incorrect case to ${quote(target)}; use ${caseMatches.map(quote).join(' or ')}`,
      )
      return
    }

    report(
      document,
      position,
      `${label} target ${quote(url)} resolves to missing repository path ${quote(target)}`,
    )
  }

  for (const document of documents.values()) {
    visit(document.tree, (node) => {
      if (node.type === 'link' || node.type === 'image') {
        validateDestination(document, node.position, node.url, node.type === 'image')
        return
      }

      if (node.type === 'linkReference' || node.type === 'imageReference') {
        const definition = document.definitions.get(node.identifier)
        const isImage = node.type === 'imageReference'

        if (!definition) {
          report(
            document,
            node.position,
            `${isImage ? 'image' : 'link'} reference ${quote(node.label ?? node.identifier)} has no definition`,
          )
          return
        }

        validateDestination(document, node.position, definition.url, isImage)
        return
      }

      if (node.type === 'html') {
        for (const destination of htmlDestinations(node)) {
          report(
            document,
            destination.position,
            `${destination.isImage ? 'image' : 'link'} target ${quote(destination.url)} uses raw HTML; use Markdown link or image syntax so the website can render it`,
          )
        }
      }
    })
  }

  return { errors, stats }
}

async function main() {
  const discovered = await discoverRepository()
  const markdownPaths = [...discovered.files]
    .filter((relativePath) => path.posix.extname(relativePath).toLowerCase() === '.md')
    .sort(naturalCompare)
  const parsedDocuments = await Promise.all(markdownPaths.map(parseDocument))
  const documents = new Map(parsedDocuments.map((document) => [document.path, document]))
  const { errors, stats } = validateDocuments(documents, discovered)

  if (errors.length > 0) {
    console.error(`Content validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`)

    for (const error of errors) {
      console.error(`- ${error}`)
    }

    process.exitCode = 1
    return
  }

  console.log(
    `Validated ${markdownPaths.length} Markdown files: ${stats.localLinks} local links, `
    + `${stats.localImages} local images, and ${stats.headingFragments} heading fragments.`,
  )
}

main().catch((error) => {
  console.error(`Content validation failed: ${error.message}`)
  process.exitCode = 1
})
