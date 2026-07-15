import { describe, expect, it } from "vitest"

import type { ContentDocument, ContentManifest } from "../types"
import {
  parseHashLocation,
  resolveContentLink,
  repositoryAssetUrl,
  resolveImagePath,
  routeHref,
} from "./navigation"

const root: ContentDocument = {
  path: "README.md",
  route: "/",
  title: "Evolution revision guide",
  headings: [{ depth: 1, text: "Evolution revision guide", id: "evolution-revision-guide" }],
  summary: "",
  wordCount: 100,
  readMinutes: 1,
  hasMermaid: false,
  hasMath: false,
  section: "root",
}

const lesson: ContentDocument = {
  ...root,
  path: "lessons/01-history/README.md",
  route: "/lessons/01-history/",
  title: "History",
  section: "lessons",
}

const manifest: ContentManifest = {
  version: 1,
  docs: [root, lesson],
  directories: [".", "lessons", "lessons/01-history"],
}

describe("hash routes", () => {
  it("keeps document anchors separate from the route", () => {
    const href = routeHref("/lessons/01-history/", "darwins-finches")
    expect(href).toBe("#/lessons/01-history/#darwins-finches")
    expect(parseHashLocation(href)).toEqual({
      route: "/lessons/01-history/",
      anchor: "darwins-finches",
    })
  })

  it("uses the root page when there is no hash route", () => {
    expect(parseHashLocation("")).toEqual({ route: "/" })
  })
})

describe("repository links", () => {
  it("maps a nested README to its directory route", () => {
    expect(resolveContentLink("lessons/01-history/README.md", root, manifest)).toMatchObject({
      kind: "route",
      route: "/lessons/01-history/",
    })
  })

  it("maps a directory without a README to a folder route", () => {
    expect(resolveContentLink("lessons/", root, manifest)).toMatchObject({
      kind: "route",
      route: "/lessons/",
    })
  })

  it("maps extensionless repository files to copied assets", () => {
    expect(resolveContentLink("LICENSE", root, manifest)).toEqual({
      kind: "asset",
      assetPath: "LICENSE",
    })
  })

  it("keeps document queries out of the hash-routed heading anchor", () => {
    expect(resolveContentLink("lessons/01-history/README.md?view=1#history", root, manifest)).toMatchObject({
      kind: "route",
      href: "#/lessons/01-history/#history",
      anchor: "history",
    })
  })

  it("preserves asset queries and fragments outside the encoded filename", () => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { baseURI: "https://example.test/evolution-guide/" },
    })
    expect(repositoryAssetUrl("figure.pdf?download=1#page=2")).toBe(
      "https://example.test/evolution-guide/content/figure.pdf?download=1#page=2",
    )
    Reflect.deleteProperty(globalThis, "document")
  })

  it("leaves timestamped YouTube URLs untouched", () => {
    const url = "https://www.youtube.com/watch?v=abc&t=42s"
    expect(resolveContentLink(url, root, manifest)).toEqual({ kind: "external", href: url })
  })

  it("resolves images from the Markdown source directory", () => {
    expect(resolveImagePath("lessons/01-history/note.md", "images/darwin.jpg")).toBe(
      "lessons/01-history/images/darwin.jpg",
    )
    expect(resolveImagePath("lessons/01-history/note.md", "images/tree.svg?mode=ink#detail")).toBe(
      "lessons/01-history/images/tree.svg?mode=ink#detail",
    )
  })
})
