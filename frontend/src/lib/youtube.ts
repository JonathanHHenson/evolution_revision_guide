export interface YouTubeVideoTarget {
  videoId: string
  startSeconds: number
  originalUrl: string
}

export interface FloatingVideoRequest extends YouTubeVideoTarget {
  requestId: number
  focusOnOpen: boolean
}

function parseTimeValue(value: string | null): number {
  if (!value) return 0

  if (/^\d+(?:\.\d+)?s?$/i.test(value)) {
    return Math.max(0, Math.floor(Number.parseFloat(value)))
  }

  if (/^\d+(?::\d+){1,2}$/.test(value)) {
    return value
      .split(":")
      .map(Number)
      .reduce((total, part) => total * 60 + part, 0)
  }

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value)
  if (!match) return 0

  return Number(match[1] ?? 0) * 3600
    + Number(match[2] ?? 0) * 60
    + Number(match[3] ?? 0)
}

export function parseYouTubeUrl(value: string): YouTubeVideoTarget | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
  let videoId = ""

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? ""
  } else if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") ?? ""
    } else {
      const segments = url.pathname.split("/").filter(Boolean)
      if (["embed", "live", "shorts"].includes(segments[0] ?? "")) videoId = segments[1] ?? ""
    }
  }

  if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null

  const startValue = url.searchParams.get("t")
    ?? url.searchParams.get("start")
    ?? (url.hash.startsWith("#t=") ? url.hash.slice(3) : null)

  return {
    videoId,
    startSeconds: parseTimeValue(startValue),
    originalUrl: value,
  }
}
