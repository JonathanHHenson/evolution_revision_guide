import type { ContentManifest } from "../types"
import { routeHref } from "../lib/navigation"
import { ArchipelagoMap } from "./ArchipelagoMap"
import { ArrowIcon, FeatherIcon } from "./Icons"

export function VoyageBanner({ manifest }: { manifest: ContentManifest }) {
  const lessonCount = new Set(
    manifest.docs
      .filter((doc) => doc.path.startsWith("lessons/"))
      .map((doc) => doc.path.split("/")[1]),
  ).size
  const courseMap = manifest.docs.find((doc) => doc.path === "docs/00-course-map.md")

  return (
    <section className="voyage-banner" aria-labelledby="voyage-banner-title">
      <div className="voyage-copy">
        <span className="eyebrow"><FeatherIcon /> Welcome aboard</span>
        <h2 id="voyage-banner-title">Follow the evidence across deep time.</h2>
        <p>Read the guide like Darwin’s field journal: make observations, compare branches, and follow every source trail back to the recording.</p>
        {courseMap && <a className="primary-button" href={routeHref(courseMap.route)}>Chart a study route <ArrowIcon /></a>}
      </div>
      <div className="voyage-chart">
        <div className="chart-label"><span>Expedition log</span><strong>{lessonCount} lesson islands</strong></div>
        <ArchipelagoMap />
        <span className="chart-coordinate">GALÁPAGOS INSPIRATION · 00° S</span>
      </div>
    </section>
  )
}
