import { useEffect, useMemo, useState } from "react"

import type { ContentDocument } from "../types"
import { routeHref } from "../lib/navigation"

interface TableOfContentsProps {
  document: ContentDocument
}

export function TableOfContents({ document }: TableOfContentsProps) {
  const headings = useMemo(
    () => document.headings.filter((heading) => heading.depth === 2 || heading.depth === 3),
    [document],
  )
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "")

  useEffect(() => {
    const elements = headings
      .map((heading) => window.document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (!elements.length) return

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)
      if (visible[0]?.target.id) setActiveId(visible[0].target.id)
    }, { rootMargin: "-18% 0px -68%", threshold: [0, 1] })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [document.path, headings])

  if (!headings.length) return null

  return (
    <aside className="page-toc" aria-label="On this page">
      <span className="eyebrow">Specimen index</span>
      <h2>On this page</h2>
      <ol>
        {headings.map((heading) => (
          <li key={heading.id} className={`depth-${heading.depth}${activeId === heading.id ? " active" : ""}`}>
            <a href={routeHref(document.route, heading.id)}>{heading.text}</a>
          </li>
        ))}
      </ol>
      <div className="toc-stamp" aria-hidden="true">
        <span>LOGGED</span>
        <strong>{document.readMinutes} MIN READ</strong>
      </div>
    </aside>
  )
}
