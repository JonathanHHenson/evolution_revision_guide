import { useEffect, useMemo, useState } from "react"

import type { ContentDocument } from "../types"
import { routeHref } from "../lib/navigation"
import { ArchipelagoMap } from "./ArchipelagoMap"
import { BookIcon, CloseIcon, FeatherIcon, MapIcon, SearchIcon, ShuffleIcon } from "./Icons"

interface SidebarProps {
  docs: ContentDocument[]
  currentRoute: string
  open: boolean
  onClose: () => void
}

function isCurrent(doc: ContentDocument, currentRoute: string) {
  return doc.route === currentRoute
}

function NavItem({ doc, currentRoute, onNavigate, compact = false }: {
  doc: ContentDocument
  currentRoute: string
  onNavigate: () => void
  compact?: boolean
}) {
  return (
    <a
      className={`nav-item${isCurrent(doc, currentRoute) ? " active" : ""}${compact ? " compact" : ""}`}
      href={routeHref(doc.route)}
      onClick={onNavigate}
      aria-current={isCurrent(doc, currentRoute) ? "page" : undefined}
    >
      <span className="nav-dot" aria-hidden="true" />
      <span>{doc.title}</span>
    </a>
  )
}

export function Sidebar({ docs, currentRoute, open, onClose }: SidebarProps) {
  const [query, setQuery] = useState("")
  const normalisedQuery = query.trim().toLocaleLowerCase()

  const rootOrder = ["README.md", "ROADMAP.md", "GLOSSARY.md", "APPENDIX.md"]
  const rootDocs = docs
    .filter((doc) => doc.section === "root" && doc.path !== "AGENTS.md")
    .sort((left, right) => rootOrder.indexOf(left.path) - rootOrder.indexOf(right.path))

  const guideDocs = docs.filter((doc) => doc.section === "docs")
  const sourceDocs = docs.filter((doc) => doc.section === "sources")
  const lessonGroups = useMemo(() => {
    const groups = new Map<string, ContentDocument[]>()
    for (const doc of docs.filter((candidate) => candidate.section === "lessons")) {
      const directory = doc.path.split("/").slice(0, 2).join("/")
      groups.set(directory, [...(groups.get(directory) ?? []), doc])
    }
    const lessonPageRank = (doc: ContentDocument) => {
      if (doc.path.endsWith("/README.md")) return -20
      if (doc.path.endsWith("/00-wills-opening.md")) return -10
      if (doc.path.endsWith("/will-duffy-qa.md")) return 1000
      return 0
    }

    return [...groups.entries()].map(([directory, documents]) => {
      const orderedDocs = documents.sort((left, right) => (
        lessonPageRank(left) - lessonPageRank(right)
        || left.path.localeCompare(right.path, "en", { numeric: true })
      ))
      return {
        directory,
        docs: orderedDocs,
        landing: orderedDocs.find((doc) => doc.path.endsWith("/README.md")),
      }
    })
  }, [docs])

  const searchResults = useMemo(() => {
    if (!normalisedQuery) return []
    return docs.filter((doc) => {
      if (doc.path === "AGENTS.md") return false
      const haystack = [doc.title, doc.path, ...doc.headings.map((heading) => heading.text)]
        .join(" ")
        .toLocaleLowerCase()
      return haystack.includes(normalisedQuery)
    }).slice(0, 18)
  }, [docs, normalisedQuery])

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1024px)")
    if (!open || !mobileQuery.matches) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const backgroundRegions = document.querySelectorAll<HTMLElement>(
      ".skip-link, .site-header .brand, .site-header .header-actions, .main-content, .floating-video",
    )
    backgroundRegions.forEach((region) => region.setAttribute("inert", ""))

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    mobileQuery.addEventListener("change", handleViewportChange)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      mobileQuery.removeEventListener("change", handleViewportChange)
      backgroundRegions.forEach((region) => region.removeAttribute("inert"))
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [onClose, open])

  const islandHop = () => {
    const candidates = docs.filter((doc) => doc.path !== "AGENTS.md" && doc.route !== currentRoute)
    const destination = candidates[Math.floor(Math.random() * candidates.length)]
    if (destination) window.location.hash = routeHref(destination.route)
    onClose()
  }

  return (
    <aside id="field-journal-navigation" className={`sidebar${open ? " open" : ""}`} aria-label="Field journal navigation">
      <div className="sidebar-mobile-heading">
        <span>Expedition log</span>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close navigation"><CloseIcon /></button>
      </div>

      <div className="sidebar-map">
        <span className="eyebrow">HMS Beagle reading route</span>
        <ArchipelagoMap />
      </div>

      <label className="search-field">
        <SearchIcon />
        <span className="sr-only">Search pages and headings</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the field notes…"
        />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
      </label>

      <nav className="journal-nav">
        {normalisedQuery ? (
          <section className="nav-section search-results">
            <div className="nav-heading"><SearchIcon /><span>Matches</span><small>{searchResults.length}</small></div>
            {searchResults.length ? searchResults.map((doc) => (
              <NavItem key={doc.path} doc={doc} currentRoute={currentRoute} onNavigate={onClose} />
            )) : <p className="no-results">No tracks found. Try a species, process, or lesson number.</p>}
          </section>
        ) : (
          <>
            <section className="nav-section">
              <div className="nav-heading"><BookIcon /><span>Start here</span></div>
              {rootDocs.map((doc) => <NavItem key={doc.path} doc={doc} currentRoute={currentRoute} onNavigate={onClose} />)}
            </section>

            <section className="nav-section">
              <div className="nav-heading"><MapIcon /><span>Cross-course trails</span></div>
              {guideDocs.map((doc) => <NavItem key={doc.path} doc={doc} currentRoute={currentRoute} onNavigate={onClose} />)}
            </section>

            <section className="nav-section lesson-nav">
              <div className="nav-heading"><FeatherIcon /><span>Lesson islands</span><small>{lessonGroups.length}</small></div>
              {lessonGroups.map((group, index) => {
                const active = group.docs.some((doc) => isCurrent(doc, currentRoute))
                return (
                  <details key={group.directory} open={active || index === 0}>
                    <summary>
                      <span className="island-number">{String(index + 1).padStart(2, "0")}</span>
                      <span>{group.landing?.title ?? group.directory.split("/").at(-1)?.replaceAll("-", " ")}</span>
                    </summary>
                    <div className="lesson-pages">
                      {group.docs.map((doc) => <NavItem key={doc.path} doc={doc} currentRoute={currentRoute} onNavigate={onClose} compact />)}
                    </div>
                  </details>
                )
              })}
            </section>

            <section className="nav-section">
              <div className="nav-heading"><MapIcon /><span>Source log</span></div>
              {sourceDocs.map((doc) => <NavItem key={doc.path} doc={doc} currentRoute={currentRoute} onNavigate={onClose} />)}
            </section>

          </>
        )}
      </nav>

      <button className="island-hop" type="button" onClick={islandHop}>
        <ShuffleIcon />
        <span><strong>Island hop</strong><small>Open a surprise field note</small></span>
      </button>
    </aside>
  )
}
