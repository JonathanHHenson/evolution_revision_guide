import { useEffect, useId, useState } from "react"

interface MermaidDiagramProps {
  source: string
  label?: string
  theme: "light" | "dark"
}

let renderQueue = Promise.resolve()

export function MermaidDiagram({ source, label = "Relationship diagram", theme }: MermaidDiagramProps) {
  const reactId = useId()
  const [svg, setSvg] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const diagramId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}`

    setSvg("")
    setError("")

    renderQueue = renderQueue.then(async () => {
      try {
        const { default: mermaid } = await import("mermaid")
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          flowchart: { htmlLabels: false, curve: "basis" },
          themeVariables: theme === "dark"
            ? {
              background: "#173738",
              primaryColor: "#285b59",
              primaryTextColor: "#f7ecd2",
              primaryBorderColor: "#eeb15f",
              lineColor: "#91c8bd",
              secondaryColor: "#4f6849",
              tertiaryColor: "#3a4b45",
            }
            : {
              background: "#f8f0d9",
              primaryColor: "#dce8cf",
              primaryTextColor: "#173c3d",
              primaryBorderColor: "#34766f",
              lineColor: "#34766f",
              secondaryColor: "#f6d6a7",
              tertiaryColor: "#e8dfc5",
            },
        })
        const rendered = await mermaid.render(diagramId, source)
        if (!cancelled) setSvg(rendered.svg)
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "The diagram could not be rendered.")
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [reactId, source, theme])

  if (error) {
    return (
      <aside className="diagram-fallback" aria-label={`${label} source`}>
        <strong>Diagram source</strong>
        <p>The visual renderer encountered an error, so the original Mermaid description is shown.</p>
        <pre><code>{source}</code></pre>
      </aside>
    )
  }

  return (
    <figure className="mermaid-diagram" aria-label={label}>
      {svg ? (
        <div className="mermaid-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="diagram-loading" role="status">
          <span className="tortoise-loader" aria-hidden="true" />
          Charting this branch…
        </div>
      )}
    </figure>
  )
}
