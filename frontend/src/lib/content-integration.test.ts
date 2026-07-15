import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkParse from "remark-parse"
import { describe, expect, it } from "vitest"
import { unified } from "unified"
import { visit } from "unist-util-visit"

import type { ContentManifest } from "../types"
import { resolveContentLink, resolveImagePath } from "./navigation"
import { parseYouTubeUrl } from "./youtube"

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const manifest = JSON.parse(
  readFileSync(path.join(frontendRoot, "public/content-manifest.json"), "utf8"),
) as ContentManifest
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
const isExternal = (destination: string) => destination.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(destination)

describe("generated content integration", () => {
  it("assigns a unique route to every Markdown document", () => {
    const routes = manifest.docs.map((document) => document.route)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it("resolves every inline repository link with the browser resolver", () => {
    const failures: string[] = []
    let checkedLinks = 0

    for (const document of manifest.docs) {
      const source = readFileSync(path.join(frontendRoot, "public/content", document.path), "utf8")
      const tree = parser.parse(source)

      visit(tree, "link", (node) => {
        checkedLinks += 1
        const resolved = resolveContentLink(node.url, document, manifest)
        if (resolved.kind === "broken") failures.push(`${document.path} -> ${node.url}: ${resolved.reason}`)
        if (resolved.kind === "asset") {
          const assetPath = resolved.assetPath.split(/[?#]/, 1)[0]
          if (!existsSync(path.join(frontendRoot, "public/content", assetPath))) {
            failures.push(`${document.path} -> ${node.url}: copied asset is missing`)
          }
        }
      })
    }

    expect(checkedLinks).toBeGreaterThan(500)
    expect(failures).toEqual([])
  })

  it("can open every timestamped YouTube link in the floating player", () => {
    const failures: string[] = []
    let timestampLinks = 0

    for (const document of manifest.docs) {
      const source = readFileSync(path.join(frontendRoot, "public/content", document.path), "utf8")
      const tree = parser.parse(source)

      visit(tree, "link", (node) => {
        if (!/youtube\.com\/watch\?.*[?&]t=/i.test(node.url)) return
        timestampLinks += 1
        if (!parseYouTubeUrl(node.url)) failures.push(`${document.path} -> ${node.url}`)
      })
    }

    expect(timestampLinks).toBeGreaterThan(2000)
    expect(failures).toEqual([])
  })

  it("maps every local image to a copied, case-sensitive media path", () => {
    const failures: string[] = []
    let checkedImages = 0

    for (const document of manifest.docs) {
      const source = readFileSync(path.join(frontendRoot, "public/content", document.path), "utf8")
      const tree = parser.parse(source)

      visit(tree, "image", (node) => {
        if (isExternal(node.url)) {
          failures.push(`${document.path} embeds a remote image: ${node.url}`)
          return
        }
        checkedImages += 1
        const assetPath = resolveImagePath(document.path, node.url)
        if (!existsSync(path.join(frontendRoot, "public/content", assetPath))) {
          failures.push(`${document.path} -> ${node.url}: copied image is missing`)
        }
      })
    }

    expect(checkedImages).toBe(59)
    expect(failures).toEqual([])
  })
})
