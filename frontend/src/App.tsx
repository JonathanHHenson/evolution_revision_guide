import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"

import type { ContentDocument, ContentManifest, RouteLocation } from "./types"
import type { FloatingVideoRequest, YouTubeVideoTarget } from "./lib/youtube"
import { githubFileUrl } from "./lib/github"
import {
  directoryForRoute,
  directoryRoute,
  documentForRoute,
  parseHashLocation,
  publicAssetUrl,
  repositoryAssetUrl,
  routeHref,
} from "./lib/navigation"
import { ArrowIcon, CheckIcon, CopyIcon, FeatherIcon, MapIcon } from "./components/Icons"
import { FloatingVideoPlayer } from "./components/FloatingVideoPlayer"
import { FolderIndex } from "./components/FolderIndex"
import { Header } from "./components/Header"
import { Lightbox, type LightboxImage } from "./components/Lightbox"
import { MarkdownDocument } from "./components/MarkdownDocument"
import { Sidebar } from "./components/Sidebar"
import { TableOfContents } from "./components/TableOfContents"
import { VoyageBanner } from "./components/VoyageBanner"

type Theme = "light" | "dark"

function initialTheme(): Theme {
  const stored = localStorage.getItem("field-guide-theme")
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function initialFloatingVideoSetting() {
  const stored = localStorage.getItem("field-guide-floating-video")
  if (stored !== null) return stored === "true"

  const mobileUser = window.matchMedia("(max-width: 720px), (hover: none) and (pointer: coarse)").matches
  return !mobileUser
}

function directoryOf(path: string) {
  const index = path.lastIndexOf("/")
  return index === -1 ? "." : path.slice(0, index)
}

function pageOrder(left: ContentDocument, right: ContentDocument) {
  const rank = (doc: ContentDocument) => {
    if (doc.path.endsWith("README.md")) return -20
    if (doc.path.endsWith("00-wills-opening.md")) return -10
    if (doc.path.endsWith("will-duffy-qa.md")) return 1000
    return 0
  }
  return rank(left) - rank(right) || left.path.localeCompare(right.path, "en", { numeric: true })
}

function siblingPages(document: ContentDocument, manifest: ContentManifest) {
  const siblings = manifest.docs
    .filter((candidate) => (
      directoryOf(candidate.path) === directoryOf(document.path)
      && candidate.path !== "AGENTS.md"
    ))
    .sort(pageOrder)
  const index = siblings.findIndex((candidate) => candidate.path === document.path)
  return { previous: siblings[index - 1], next: siblings[index + 1] }
}

function Breadcrumbs({ document, directory }: { document?: ContentDocument; directory?: string }) {
  const folder = document ? directoryOf(document.path) : directory
  const segments = folder && folder !== "." ? folder.split("/") : []

  if (!segments.length && (!document || document.route === "/")) return null

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <a href="#/">Ship’s log</a>
      {segments.map((segment, index) => {
        const target = segments.slice(0, index + 1).join("/")
        return (
          <span key={target}>
            <span aria-hidden="true">/</span>
            <a href={routeHref(directoryRoute(target))}>{segment.replace(/^\d+-/, "").replaceAll("-", " ")}</a>
          </span>
        )
      })}
      {document && document.path !== "README.md" && (
        <span><span aria-hidden="true">/</span><span aria-current="page">{document.title}</span></span>
      )}
    </nav>
  )
}

function DocumentTools({ document }: { document: ContentDocument }) {
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="document-tools">
      <div className="document-facts">
        <span className="field-chip"><FeatherIcon /> Field note</span>
        <span>{document.readMinutes} min read</span>
        <span>{document.wordCount.toLocaleString()} words</span>
        {document.hasMermaid && <span>diagrammed</span>}
        {document.hasMath && <span>equations</span>}
      </div>
      <div className="document-actions">
        <a href={githubFileUrl(document.path)} target="_blank" rel="noreferrer">View in GitHub</a>
        <button type="button" onClick={copyAddress}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  )
}

function PageTurner({ document, manifest }: { document: ContentDocument; manifest: ContentManifest }) {
  const { previous, next } = siblingPages(document, manifest)
  if (!previous && !next) return null

  return (
    <nav className="page-turner" aria-label="Adjacent notebook pages">
      {previous ? (
        <a className="previous-page" href={routeHref(previous.route)}>
          <ArrowIcon direction="left" />
          <span><small>Previous field note</small><strong>{previous.title}</strong></span>
        </a>
      ) : <span />}
      {next && (
        <a className="next-page" href={routeHref(next.route)}>
          <span><small>Next field note</small><strong>{next.title}</strong></span>
          <ArrowIcon />
        </a>
      )}
    </nav>
  )
}

function NotFound({ route }: { route: string }) {
  return (
    <article className="not-found">
      <div className="lost-island" aria-hidden="true"><MapIcon /></div>
      <span className="eyebrow">Uncharted waters</span>
      <h1>This page is not on the map.</h1>
      <p>The route <code>{route}</code> does not match a published Markdown page or indexed folder.</p>
      <a className="primary-button" href="#/">Return to the ship’s log <ArrowIcon /></a>
    </article>
  )
}

export default function App() {
  const [manifest, setManifest] = useState<ContentManifest | null>(null)
  const [manifestError, setManifestError] = useState("")
  const [location, setLocation] = useState<RouteLocation>(() => parseHashLocation(window.location.hash))
  const [source, setSource] = useState<string | null>(null)
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [sourceError, setSourceError] = useState("")
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [floatingVideoEnabled, setFloatingVideoEnabled] = useState(initialFloatingVideoSetting)
  const [floatingVideo, setFloatingVideo] = useState<FloatingVideoRequest | null>(null)
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null)
  const [progress, setProgress] = useState(0)
  const lastSettledRoute = useRef(location.route)
  const scrollPositions = useRef(new Map<string, number>())
  const nextNavigation = useRef<"link" | "history">("history")
  const pendingScrollRestore = useRef<number | null>(null)
  const videoRequestId = useRef(0)
  const floatingVideoTrigger = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(publicAssetUrl("content-manifest.json"), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Content manifest returned ${response.status}`)
        return response.json() as Promise<ContentManifest>
      })
      .then(setManifest)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setManifestError(error instanceof Error ? error.message : "The content manifest could not be loaded.")
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const previousRestoration = history.scrollRestoration
    history.scrollRestoration = "manual"

    const updateLocation = (event: HashChangeEvent) => {
      const previousHash = new URL(event.oldURL).hash || "#/"
      scrollPositions.current.set(previousHash, window.scrollY)
      const targetHash = window.location.hash || "#/"
      const savedPosition = scrollPositions.current.get(targetHash)
      pendingScrollRestore.current = nextNavigation.current === "history" && savedPosition !== undefined
        ? savedPosition
        : null
      nextNavigation.current = "history"
      setLocation(parseHashLocation(window.location.hash))
    }
    window.addEventListener("hashchange", updateLocation)
    return () => {
      history.scrollRestoration = previousRestoration
      window.removeEventListener("hashchange", updateLocation)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("field-guide-theme", theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem("field-guide-floating-video", String(floatingVideoEnabled))
    if (!floatingVideoEnabled) setFloatingVideo(null)
  }, [floatingVideoEnabled])

  const currentDocument = manifest ? documentForRoute(manifest, location.route) : undefined
  const currentDirectory = manifest && !currentDocument
    ? directoryForRoute(manifest, location.route)
    : undefined

  useEffect(() => {
    if (!currentDocument) {
      setSource(null)
      setSourcePath(null)
      setSourceError("")
      return
    }

    const controller = new AbortController()
    setSource(null)
    setSourceError("")
    fetch(repositoryAssetUrl(currentDocument.path), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`${currentDocument.path} returned ${response.status}`)
        return response.text()
      })
      .then((loadedSource) => {
        setSource(loadedSource)
        setSourcePath(currentDocument.path)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setSourceError(error instanceof Error ? error.message : "The field note could not be loaded.")
      })
    return () => controller.abort()
  }, [currentDocument])

  useEffect(() => {
    const pageTitle = currentDocument?.title
      ?? (currentDirectory ? `${currentDirectory === "." ? "Field journal" : currentDirectory} · Evolution Field Guide` : "Evolution Field Guide")
    document.title = currentDocument ? `${pageTitle} · Evolution Field Guide` : pageTitle
  }, [currentDirectory, currentDocument])

  const displayedSource = currentDocument && sourcePath === currentDocument.path
    ? source
    : null

  useEffect(() => {
    if (currentDocument && displayedSource === null) return
    const routeChanged = lastSettledRoute.current !== location.route
    const frame = window.requestAnimationFrame(() => {
      if (pendingScrollRestore.current !== null) {
        window.scrollTo({ top: pendingScrollRestore.current })
        pendingScrollRestore.current = null
      } else if (location.anchor) {
        const target = document.getElementById(location.anchor)
        if (target) {
          if (!target.hasAttribute("tabindex")) target.tabIndex = -1
          target.scrollIntoView({ block: "start" })
          target.focus({ preventScroll: true })
        }
      } else {
        window.scrollTo({ top: 0 })
        if (routeChanged) {
          const heading = document.querySelector<HTMLElement>(
            ".markdown-body h1, .folder-index h1, .not-found h1",
          )
          if (heading) {
            heading.tabIndex = -1
            heading.focus({ preventScroll: true })
          }
        }
      }
      lastSettledRoute.current = location.route
    })
    return () => window.cancelAnimationFrame(frame)
  }, [currentDirectory, currentDocument, displayedSource, location.anchor, location.route])

  useEffect(() => {
    const updateProgress = () => {
      const article = document.querySelector<HTMLElement>(".markdown-body")
      if (!article) {
        setProgress(0)
        return
      }
      const top = article.offsetTop
      const distance = Math.max(1, article.offsetHeight - window.innerHeight * 0.55)
      setProgress(Math.min(100, Math.max(0, ((window.scrollY - top + 120) / distance) * 100)))
    }
    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })
    window.addEventListener("resize", updateProgress)
    return () => {
      window.removeEventListener("scroll", updateProgress)
      window.removeEventListener("resize", updateProgress)
    }
  }, [displayedSource, currentDirectory])

  const handleRouteClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return

    const target = event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>('a[href^="#/"]')
      : null
    const targetHash = target?.getAttribute("href")
    if (!targetHash) return

    const currentHash = window.location.hash || "#/"
    scrollPositions.current.set(currentHash, window.scrollY)
    const currentLocation = parseHashLocation(currentHash)
    const targetLocation = parseHashLocation(targetHash)
    const repeatedDestination = currentLocation.route === targetLocation.route
      && currentLocation.anchor === targetLocation.anchor

    if (repeatedDestination) {
      event.preventDefault()
      if (targetLocation.anchor) {
        const heading = document.getElementById(targetLocation.anchor)
        if (heading) {
          if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1
          heading.scrollIntoView({ block: "start" })
          heading.focus({ preventScroll: true })
        }
      } else {
        window.scrollTo({ top: 0 })
        const heading = document.querySelector<HTMLElement>(
          ".markdown-body h1, .folder-index h1, .not-found h1",
        )
        if (heading) {
          heading.tabIndex = -1
          heading.focus({ preventScroll: true })
        }
      }
      return
    }

    nextNavigation.current = "link"
  }, [])

  const openFloatingVideo = useCallback((
    target: YouTubeVideoTarget,
    focusOnOpen: boolean,
    trigger: HTMLAnchorElement,
  ) => {
    videoRequestId.current += 1
    floatingVideoTrigger.current = trigger
    setFloatingVideo({ ...target, requestId: videoRequestId.current, focusOnOpen })
  }, [])
  const closeFloatingVideo = useCallback(() => {
    setFloatingVideo(null)
    window.requestAnimationFrame(() => {
      if (floatingVideoTrigger.current?.isConnected) floatingVideoTrigger.current.focus()
    })
  }, [])
  const openFloatingVideoOnYouTube = useCallback(() => {
    setFloatingVideoEnabled(false)
    closeFloatingVideo()
  }, [closeFloatingVideo])
  const toggleFloatingVideo = useCallback(() => {
    setFloatingVideoEnabled((enabled) => !enabled)
  }, [])
  const toggleNavigation = useCallback(() => setNavigationOpen((open) => !open), [])
  const closeNavigation = useCallback(() => setNavigationOpen(false), [])
  const closeLightbox = useCallback(() => setLightboxImage(null), [])
  const articleClass = useMemo(() => currentDocument ? "page-grid with-toc" : "page-grid", [currentDocument])

  if (manifestError) {
    return <main className="boot-error"><CompassMarkFallback /><h1>The field journal could not be opened.</h1><p>{manifestError}</p><p>Run <code>npm run content:sync</code> in <code>frontend/</code> and reload.</p></main>
  }

  if (!manifest) {
    return <main className="boot-loading"><span className="tortoise-loader" /><p>Unrolling the field maps…</p></main>
  }

  return (
    <div className="app" onClickCapture={handleRouteClick}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          const main = document.getElementById("main-content")
          main?.focus({ preventScroll: true })
          main?.scrollIntoView({ block: "start" })
        }}
      >
        Skip to field note
      </a>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((value) => value === "light" ? "dark" : "light")}
        navigationOpen={navigationOpen}
        onToggleNavigation={toggleNavigation}
        floatingVideoEnabled={floatingVideoEnabled}
        onToggleFloatingVideo={toggleFloatingVideo}
        progress={progress}
      />
      {navigationOpen && <button className="sidebar-scrim" type="button" tabIndex={-1} onClick={closeNavigation} aria-label="Close navigation" />}
      <Sidebar docs={manifest.docs} currentRoute={location.route} open={navigationOpen} onClose={closeNavigation} />

      <main id="main-content" className="main-content" tabIndex={-1}>
        <Breadcrumbs document={currentDocument} directory={currentDirectory} />
        {currentDocument && <DocumentTools document={currentDocument} />}
        {currentDocument?.route === "/" && <VoyageBanner manifest={manifest} />}

        <div className={articleClass}>
          <div className="content-column">
            {currentDocument && displayedSource !== null && (
              <>
                <MarkdownDocument
                  source={displayedSource}
                  document={currentDocument}
                  manifest={manifest}
                  theme={theme}
                  floatingVideoEnabled={floatingVideoEnabled}
                  onOpenVideo={openFloatingVideo}
                  onOpenImage={setLightboxImage}
                />
                <PageTurner document={currentDocument} manifest={manifest} />
              </>
            )}
            {currentDocument && displayedSource === null && !sourceError && (
              <div className="page-loading"><span className="tortoise-loader" /><p>Opening {currentDocument.title}…</p></div>
            )}
            {sourceError && <div className="content-error"><h1>This field note could not be opened.</h1><p>{sourceError}</p></div>}
            {currentDirectory && <FolderIndex directory={currentDirectory} manifest={manifest} />}
            {!currentDocument && !currentDirectory && <NotFound route={location.route} />}
          </div>
          {currentDocument && displayedSource !== null && <TableOfContents document={currentDocument} />}
        </div>
      </main>

      {floatingVideoEnabled && floatingVideo && (
        <FloatingVideoPlayer
          video={floatingVideo}
          onClose={closeFloatingVideo}
          onOpenYouTube={openFloatingVideoOnYouTube}
        />
      )}
      <Lightbox image={lightboxImage} onClose={closeLightbox} />
    </div>
  )
}

function CompassMarkFallback() {
  return <span className="fallback-compass" aria-hidden="true">✥</span>
}
