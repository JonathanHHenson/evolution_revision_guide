import { Children, isValidElement, useMemo, type ReactElement, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import type { ContentDocument, ContentManifest } from "../types"
import type { YouTubeVideoTarget } from "../lib/youtube"
import { parseYouTubeUrl } from "../lib/youtube"
import {
  repositoryAssetUrl,
  resolveContentLink,
  resolveImagePath,
  routeHref,
} from "../lib/navigation"
import { ExternalIcon, LinkIcon } from "./Icons"
import type { LightboxImage } from "./Lightbox"
import { MermaidDiagram } from "./MermaidDiagram"

interface MarkdownDocumentProps {
  source: string
  document: ContentDocument
  manifest: ContentManifest
  theme: "light" | "dark"
  floatingVideoEnabled: boolean
  onOpenVideo: (video: YouTubeVideoTarget, focusOnOpen: boolean, trigger: HTMLAnchorElement) => void
  onOpenImage: (image: LightboxImage) => void
}

function textFromChildren(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => typeof child === "string" || typeof child === "number" ? String(child) : "")
    .join("")
}

function headingComponent(level: 2 | 3, route: string) {
  const Heading = ({ children, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const Element = `h${level}` as const
    return (
      <Element id={id} {...props}>
        <span>{children}</span>
        {id && <a className="heading-anchor" href={routeHref(route, id)} aria-label="Link to this section"><LinkIcon /></a>}
      </Element>
    )
  }
  return Heading
}

export function MarkdownDocument({
  source,
  document,
  manifest,
  theme,
  floatingVideoEnabled,
  onOpenVideo,
  onOpenImage,
}: MarkdownDocumentProps) {
  const components = useMemo<Components>(() => ({
    a({ href = "", children, ...props }) {
      const resolved = resolveContentLink(href, document, manifest)

      if (resolved.kind === "external") {
        const opensNewTab = /^(https?:)?\/\//i.test(resolved.href)
        const youtubeVideo = parseYouTubeUrl(resolved.href)
        const timestamped = Boolean(youtubeVideo && /[?&#](?:t|start)=/i.test(resolved.href))
        return (
          <a
            {...props}
            className={timestamped ? `timestamp-link${floatingVideoEnabled ? " floating-enabled" : ""}` : undefined}
            href={resolved.href}
            target={opensNewTab ? "_blank" : undefined}
            rel={opensNewTab ? "noreferrer" : undefined}
            onClick={(event) => {
              if (
                floatingVideoEnabled
                && youtubeVideo
                && !event.metaKey
                && !event.ctrlKey
                && !event.shiftKey
                && !event.altKey
              ) {
                event.preventDefault()
                onOpenVideo(youtubeVideo, event.detail === 0, event.currentTarget)
              }
            }}
          >
            {children}
            {opensNewTab && <ExternalIcon className="external-icon" />}
          </a>
        )
      }

      if (resolved.kind === "route") {
        return <a {...props} href={resolved.href}>{children}</a>
      }

      if (resolved.kind === "asset") {
        return <a {...props} href={repositoryAssetUrl(resolved.assetPath)} target="_blank" rel="noreferrer">{children}</a>
      }

      return <a {...props} href={resolved.href} className="broken-link" title={resolved.reason} onClick={(event) => event.preventDefault()}>{children}</a>
    },
    img({ src = "", alt = "", ...props }) {
      const assetPath = resolveImagePath(document.path, String(src))
      const imageUrl = repositoryAssetUrl(assetPath)
      return (
        <button
          className="image-zoom"
          type="button"
          onClick={() => onOpenImage({ src: imageUrl, alt })}
          aria-label={`Open full-size figure${alt ? `: ${alt}` : ""}`}
        >
          <img
            {...props}
            src={imageUrl}
            alt={alt}
            loading="lazy"
            decoding="async"
          />
        </button>
      )
    },
    pre({ children, ...props }) {
      const onlyChild = Children.count(children) === 1 ? Children.only(children) : null
      if (isValidElement(onlyChild)) {
        const codeElement = onlyChild as ReactElement<{ className?: string; children?: ReactNode }>
        if (codeElement.props.className?.includes("language-mermaid")) {
          const diagramSource = textFromChildren(codeElement.props.children).replace(/\n$/, "")
          return <MermaidDiagram source={diagramSource} theme={theme} />
        }
      }
      return <pre {...props}>{children}</pre>
    },
    code({ className, children, ...props }) {
      return <code {...props} className={className}>{children}</code>
    },
    table({ children, ...props }) {
      return <div className="table-scroll" tabIndex={0}><table {...props}>{children}</table></div>
    },
    h2: headingComponent(2, document.route),
    h3: headingComponent(3, document.route),
  }), [document, floatingVideoEnabled, manifest, onOpenImage, onOpenVideo, theme])

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
