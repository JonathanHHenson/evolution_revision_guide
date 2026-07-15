export interface ContentHeading {
  depth: number
  text: string
  id: string
}

export interface ContentDocument {
  path: string
  route: string
  title: string
  headings: ContentHeading[]
  summary: string
  wordCount: number
  readMinutes: number
  hasMermaid: boolean
  hasMath: boolean
  section: "root" | "docs" | "lessons" | "sources" | string
}

export interface ContentManifest {
  version: number
  docs: ContentDocument[]
  directories: string[]
}

export interface RouteLocation {
  route: string
  anchor?: string
}

export type ResolvedContentLink =
  | { kind: "external"; href: string }
  | { kind: "route"; href: string; route: string; anchor?: string }
  | { kind: "asset"; assetPath: string }
  | { kind: "broken"; href: string; reason: string }
