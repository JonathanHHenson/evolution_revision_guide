import type { ContentManifest } from "../types"
import { directoryRoute, routeHref } from "../lib/navigation"
import { ArrowIcon, BookIcon, FeatherIcon, MapIcon } from "./Icons"

interface FolderIndexProps {
  directory: string
  manifest: ContentManifest
}

function parentDirectory(path: string) {
  const index = path.lastIndexOf("/")
  return index === -1 ? "." : path.slice(0, index)
}

function humanise(segment: string) {
  return segment
    .replace(/^\d+-/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function FolderIndex({ directory, manifest }: FolderIndexProps) {
  const prefix = directory === "." ? "" : `${directory}/`
  const childDirectories = manifest.directories.filter((candidate) => {
    if (candidate === directory || !candidate.startsWith(prefix)) return false
    return !candidate.slice(prefix.length).includes("/")
  })
  const directDocs = manifest.docs.filter((doc) => (
    parentDirectory(doc.path) === directory && !doc.path.endsWith("README.md")
  ))
  const title = directory === "." ? "Field journal" : humanise(directory.split("/").at(-1) ?? directory)

  return (
    <article className="folder-index">
      <header className="folder-hero">
        <span className="eyebrow">Archipelago index</span>
        <div className="folder-title-row">
          <div className="folder-compass"><MapIcon /></div>
          <div>
            <h1>{title}</h1>
            <p>Choose an island or notebook page to continue exploring.</p>
          </div>
        </div>
      </header>

      {childDirectories.length > 0 && (
        <section aria-labelledby="lesson-islands-heading">
          <h2 id="lesson-islands-heading">Lesson islands</h2>
          <div className="island-grid">
            {childDirectories.map((child, index) => {
              const readme = manifest.docs.find((doc) => doc.path === `${child}/README.md`)
              const childDocs = manifest.docs.filter((doc) => doc.path.startsWith(`${child}/`)).length
              return (
                <a className="island-card" href={routeHref(directoryRoute(child))} key={child}>
                  <span className="island-card-number">ISLAND {String(index + 1).padStart(2, "0")}</span>
                  <FeatherIcon />
                  <h3>{readme?.title ?? humanise(child.split("/").at(-1) ?? child)}</h3>
                  <p>{readme?.summary || `${childDocs} notebook ${childDocs === 1 ? "page" : "pages"}`}</p>
                  <span className="card-cta">Make landfall <ArrowIcon /></span>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {directDocs.length > 0 && (
        <section aria-labelledby="loose-pages-heading">
          <h2 id="loose-pages-heading">Notebook pages</h2>
          <div className="notebook-list">
            {directDocs.map((doc) => (
              <a href={routeHref(doc.route)} key={doc.path}>
                <BookIcon />
                <span><strong>{doc.title}</strong><small>{doc.readMinutes} min · {doc.path}</small></span>
                <ArrowIcon />
              </a>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
