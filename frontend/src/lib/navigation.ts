import type {
  ContentDocument,
  ContentManifest,
  ResolvedContentLink,
  RouteLocation,
} from "../types"

const EXTERNAL_SCHEME = /^[a-z][a-z\d+.-]*:/i

export function normaliseRoute(route: string): string {
  const withLeadingSlash = route.startsWith("/") ? route : `/${route}`
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/")

  if (collapsed === "/") return collapsed
  return collapsed.endsWith("/") ? collapsed : `${collapsed}/`
}

export function parseHashLocation(hash: string): RouteLocation {
  const value = hash.startsWith("#") ? hash.slice(1) : hash
  if (!value || !value.startsWith("/")) return { route: "/" }

  const anchorIndex = value.indexOf("#", 1)
  const routePart = anchorIndex === -1 ? value : value.slice(0, anchorIndex)
  const anchorPart = anchorIndex === -1 ? undefined : value.slice(anchorIndex + 1)

  let route = routePart
  let anchor = anchorPart

  try {
    route = decodeURI(routePart)
  } catch {
    // Keep malformed input readable so it can fall through to the not-found view.
  }

  if (anchorPart) {
    try {
      anchor = decodeURIComponent(anchorPart)
    } catch {
      // Keep the raw fragment if it is malformed.
    }
  }

  return { route: normaliseRoute(route), anchor: anchor || undefined }
}

export function routeHref(route: string, anchor?: string): string {
  const encodedRoute = normaliseRoute(route)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  const encodedAnchor = anchor ? `#${encodeURIComponent(anchor)}` : ""
  return `#${encodedRoute}${encodedAnchor}`
}

export function publicAssetUrl(relativePath: string): string {
  const cleanPath = relativePath.replace(/^\/+/, "")
  return new URL(cleanPath, new URL(".", document.baseURI)).toString()
}

export function encodeRepositoryPath(repositoryPath: string): string {
  return repositoryPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

export function repositoryAssetUrl(destination: string): string {
  const hashIndex = destination.indexOf("#")
  const beforeHash = hashIndex === -1 ? destination : destination.slice(0, hashIndex)
  const fragment = hashIndex === -1 ? "" : destination.slice(hashIndex)
  const queryIndex = beforeHash.indexOf("?")
  const repositoryPath = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex)
  const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex)

  return `${publicAssetUrl(`content/${encodeRepositoryPath(repositoryPath)}`)}${query}${fragment}`
}

function splitDestination(destination: string) {
  const hashIndex = destination.indexOf("#")
  const beforeHash = hashIndex === -1 ? destination : destination.slice(0, hashIndex)
  const queryIndex = beforeHash.indexOf("?")
  const rawPath = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex)
  const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex)
  const rawAnchor = hashIndex === -1 ? undefined : destination.slice(hashIndex + 1)

  let pathname = rawPath
  let anchor = rawAnchor

  try {
    pathname = rawPath
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/")
  } catch {
    // The build validator catches malformed repository links.
  }

  if (rawAnchor) {
    try {
      anchor = decodeURIComponent(rawAnchor)
    } catch {
      // The build validator catches malformed fragments.
    }
  }

  return { pathname, query, anchor, directoryHint: pathname.endsWith("/") }
}

export function resolveRepositoryPath(sourcePath: string, targetPath: string): string {
  if (!targetPath) return sourcePath

  const sourceDirectory = sourcePath.includes("/")
    ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
    : ""
  const initialSegments = targetPath.startsWith("/")
    ? []
    : sourceDirectory.split("/").filter(Boolean)

  for (const segment of targetPath.replace(/^\/+/, "").split("/")) {
    if (!segment || segment === ".") continue
    if (segment === "..") {
      initialSegments.pop()
      continue
    }
    initialSegments.push(segment)
  }

  return initialSegments.join("/")
}

export function directoryRoute(directory: string): string {
  return directory === "." || directory === "" ? "/" : `/${directory}/`
}

export function buildManifestLookups(manifest: ContentManifest) {
  const docsByPath = new Map(manifest.docs.map((doc) => [doc.path, doc]))
  const docsByRoute = new Map(manifest.docs.map((doc) => [normaliseRoute(doc.route), doc]))
  const directories = new Set(manifest.directories)
  return { docsByPath, docsByRoute, directories }
}

export function resolveContentLink(
  destination: string,
  currentDocument: ContentDocument,
  manifest: ContentManifest,
): ResolvedContentLink {
  if (
    destination.startsWith("//")
    || (EXTERNAL_SCHEME.test(destination) && !destination.toLowerCase().startsWith("file:"))
  ) {
    return { kind: "external", href: destination }
  }

  const { pathname, query, anchor, directoryHint } = splitDestination(destination)
  const targetPath = resolveRepositoryPath(currentDocument.path, pathname)
  const { docsByPath, directories } = buildManifestLookups(manifest)

  if (!pathname) {
    return {
      kind: "route",
      href: routeHref(currentDocument.route, anchor),
      route: currentDocument.route,
      anchor,
    }
  }

  const targetDocument = docsByPath.get(targetPath)
  if (targetDocument) {
    return {
      kind: "route",
      href: routeHref(targetDocument.route, anchor),
      route: targetDocument.route,
      anchor,
    }
  }

  const targetDirectory = targetPath.replace(/\/+$/, "") || "."
  const directoryReadme = docsByPath.get(
    targetDirectory === "." ? "README.md" : `${targetDirectory}/README.md`,
  )

  if (directoryReadme) {
    return {
      kind: "route",
      href: routeHref(directoryReadme.route, anchor),
      route: directoryReadme.route,
      anchor,
    }
  }

  if (directoryHint || directories.has(targetDirectory)) {
    const route = directoryRoute(targetDirectory)
    return { kind: "route", href: routeHref(route, anchor), route, anchor }
  }

  const hasFileExtension = /(^|\/)\.?[^/]+\.[^/]+$/.test(targetPath)
  if (hasFileExtension || targetPath === "LICENSE") {
    return { kind: "asset", assetPath: `${targetPath}${query}${anchor ? `#${anchor}` : ""}` }
  }

  return {
    kind: "broken",
    href: destination,
    reason: `No published page or asset matches ${targetPath || destination}`,
  }
}

export function resolveImagePath(sourcePath: string, imagePath: string): string {
  const { pathname, query, anchor } = splitDestination(imagePath)
  const repositoryPath = resolveRepositoryPath(sourcePath, pathname)
  return `${repositoryPath}${query}${anchor ? `#${anchor}` : ""}`
}

export function documentForRoute(
  manifest: ContentManifest,
  route: string,
): ContentDocument | undefined {
  const normalised = normaliseRoute(route)
  return manifest.docs.find((doc) => normaliseRoute(doc.route) === normalised)
}

export function directoryForRoute(manifest: ContentManifest, route: string): string | undefined {
  const normalised = normaliseRoute(route)
  const directory = normalised === "/" ? "." : normalised.slice(1, -1)
  return manifest.directories.includes(directory) ? directory : undefined
}
