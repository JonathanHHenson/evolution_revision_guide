import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { FloatingVideoRequest } from "../lib/youtube"
import {
  CloseIcon,
  ForwardTenIcon,
  GripIcon,
  ResizeIcon,
  RewindTenIcon,
} from "./Icons"

interface YouTubePlayer {
  destroy: () => void
  getCurrentTime: () => number
  loadVideoById: (options: { videoId: string; startSeconds: number }) => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

interface YouTubePlayerEvent {
  target: YouTubePlayer
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: {
    videoId: string
    host?: string
    width?: string
    height?: string
    playerVars: Record<string, string | number>
    events: {
      onReady: (event: YouTubePlayerEvent) => void
      onError: () => void
    }
  }) => YouTubePlayer
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

interface FloatingVideoPlayerProps {
  video: FloatingVideoRequest
  onClose: () => void
}

interface Position {
  left: number
  top: number
}

interface Size {
  width: number
  height: number
}

interface PointerSession {
  pointerId: number
  startX: number
  startY: number
  startLeft: number
  startTop: number
  startWidth: number
  startHeight: number
  moved: boolean
}

const DRAG_ACTIVATION_DISTANCE = 5

let youtubeApiPromise: Promise<YouTubeApi> | null = null

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  const request = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady
    const timeout = window.setTimeout(() => reject(new Error("YouTube took too long to load.")), 15000)

    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.()
      window.clearTimeout(timeout)
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error("The YouTube player API did not initialise."))
    }

    const existingScript = document.getElementById("youtube-iframe-api") as HTMLScriptElement | null
    if (existingScript) return

    const script = document.createElement("script")
    script.id = "youtube-iframe-api"
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    script.onerror = () => {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error("The YouTube player API could not be loaded."))
    }
    document.head.append(script)
  })

  youtubeApiPromise = request
  request.catch(() => {
    if (youtubeApiPromise === request) youtubeApiPromise = null
  })
  return request
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

function clampPosition(left: number, top: number, width: number, height: number): Position {
  return {
    left: clamp(left, 8, window.innerWidth - width - 8),
    top: clamp(top, 8, window.innerHeight - height - 8),
  }
}

export function FloatingVideoPlayer({ video, onClose }: FloatingVideoPlayerProps) {
  const playerWindow = useRef<HTMLDivElement>(null)
  const playerHost = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const player = useRef<YouTubePlayer | null>(null)
  const latestVideo = useRef(video)
  const loadedRequestId = useRef<number | null>(null)
  const focusedRequestId = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const dragSession = useRef<PointerSession | null>(null)
  const resizeSession = useRef<PointerSession | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [size, setSize] = useState<Size | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [keyboardControls, setKeyboardControls] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  latestVideo.current = video

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 1000)
  }, [])

  useEffect(() => {
    revealControls()
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    }
  }, [revealControls])

  useEffect(() => {
    let cancelled = false
    const host = playerHost.current
    if (!host) return

    host.replaceChildren()
    const mount = document.createElement("div")
    mount.className = "youtube-player-target"
    host.append(mount)
    setReady(false)
    setError("")

    loadYouTubeApi()
      .then((api) => {
        if (cancelled) return
        const initialVideo = latestVideo.current
        loadedRequestId.current = initialVideo.requestId
        player.current = new api.Player(mount, {
          videoId: initialVideo.videoId,
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            cc_lang_pref: "en",
            cc_load_policy: 1,
            controls: 1,
            disablekb: 0,
            fs: 1,
            playsinline: 1,
            rel: 0,
            start: initialVideo.startSeconds,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return
              player.current = event.target
              const requestedVideo = latestVideo.current
              if (loadedRequestId.current !== requestedVideo.requestId) {
                event.target.loadVideoById({
                  videoId: requestedVideo.videoId,
                  startSeconds: requestedVideo.startSeconds,
                })
                loadedRequestId.current = requestedVideo.requestId
              }
              setReady(true)
              event.target.playVideo()
            },
            onError: () => {
              if (!cancelled) setError("YouTube could not play this video here.")
            },
          },
        })
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "The video player could not be loaded.")
        }
      })

    return () => {
      cancelled = true
      player.current?.destroy()
      player.current = null
      host.replaceChildren()
    }
  }, [])

  useEffect(() => {
    setError("")
    revealControls()
    if (video.focusOnOpen && focusedRequestId.current !== video.requestId) {
      focusedRequestId.current = video.requestId
      window.requestAnimationFrame(() => closeButton.current?.focus())
    }
    if (!ready || !player.current || loadedRequestId.current === video.requestId) return

    player.current.loadVideoById({
      videoId: video.videoId,
      startSeconds: video.startSeconds,
    })
    loadedRequestId.current = video.requestId
  }, [ready, revealControls, video])

  useEffect(() => {
    const keepInsideViewport = () => {
      const frame = playerWindow.current
      if (!frame || !position) return
      const rect = frame.getBoundingClientRect()
      setPosition(clampPosition(rect.left, rect.top, rect.width, rect.height))
    }
    window.addEventListener("resize", keepInsideViewport)
    return () => window.removeEventListener("resize", keepInsideViewport)
  }, [position])

  const seekBy = (offset: number) => {
    if (!player.current) return
    const target = Math.max(0, player.current.getCurrentTime() + offset)
    player.current.seekTo(target, true)
    revealControls()
  }



  const startPointerSession = (event: ReactPointerEvent<HTMLElement>): PointerSession | null => {
    const frame = playerWindow.current
    if (!frame) return null
    const rect = frame.getBoundingClientRect()
    setPosition({ left: rect.left, top: rect.top })
    setSize({ width: rect.width, height: rect.height })
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    return {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height,
      moved: false,
    }
  }

  const moveDragSession = (event: ReactPointerEvent<HTMLElement>) => {
    const session = dragSession.current
    if (!session || session.pointerId !== event.pointerId) return

    const deltaX = event.clientX - session.startX
    const deltaY = event.clientY - session.startY
    if (!session.moved && Math.hypot(deltaX, deltaY) < DRAG_ACTIVATION_DISTANCE) return

    session.moved = true
    setPosition(clampPosition(
      session.startLeft + deltaX,
      session.startTop + deltaY,
      session.startWidth,
      session.startHeight,
    ))
  }

  const finishDragSession = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragSession.current?.pointerId === event.pointerId) dragSession.current = null
  }

  const cancelDragSession = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragSession.current?.pointerId === event.pointerId) dragSession.current = null
  }

  const moveWithKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, -10],
      ArrowDown: [0, 10],
    }
    const direction = directions[event.key]
    const frame = playerWindow.current
    if (!direction || !frame) return
    event.preventDefault()
    const rect = frame.getBoundingClientRect()
    const current = position ?? { left: rect.left, top: rect.top }
    setPosition(clampPosition(
      current.left + direction[0],
      current.top + direction[1],
      rect.width,
      rect.height,
    ))
  }

  const resizeWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const direction: Record<string, [number, number]> = {
      ArrowLeft: [-20, 0],
      ArrowRight: [20, 0],
      ArrowUp: [0, -20],
      ArrowDown: [0, 20],
    }
    const delta = direction[event.key]
    const frame = playerWindow.current
    if (!delta || !frame) return
    event.preventDefault()
    const rect = frame.getBoundingClientRect()
    const minimumWidth = Math.min(320, window.innerWidth - 16)
    const right = rect.right
    const bottom = rect.bottom
    const left = clamp(rect.left + delta[0], 8, right - minimumWidth)
    const top = clamp(rect.top + delta[1], 8, bottom - 210)
    setPosition({ left, top })
    setSize({ width: right - left, height: bottom - top })
  }

  return (
    <section
      ref={playerWindow}
      className={`floating-video${controlsVisible ? " controls-visible" : ""}${keyboardControls ? " keyboard-controls" : ""}`}
      style={{
        left: position?.left,
        top: position?.top,
        right: position ? "auto" : undefined,
        bottom: position ? "auto" : undefined,
        width: size?.width,
        height: size?.height,
      }}
      aria-label="Floating livestream player"
      onPointerMove={() => {
        setKeyboardControls(false)
        revealControls()
      }}
      onPointerEnter={() => {
        setKeyboardControls(false)
        revealControls()
      }}
      onPointerLeave={revealControls}
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) {
          setKeyboardControls(true)
          setControlsVisible(true)
          if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
        } else {
          revealControls()
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardControls(false)
      }}
    >
      <div
        ref={playerHost}
        className="floating-video-host"
        onPointerEnter={revealControls}
        onPointerMove={revealControls}
      />

      {!ready && !error && (
        <div className="floating-video-loading" role="status">
          <span className="tortoise-loader" aria-hidden="true" />
          <span>Calling the Beagle back to this timestamp…</span>
        </div>
      )}

      {error && (
        <div className="floating-video-error" role="alert">
          <strong>Player unavailable</strong>
          <span>{error}</span>
        </div>
      )}

      <div
        className="floating-video-dragbar"
        role="button"
        tabIndex={0}
        aria-label="Drag to move the floating video. Use arrow keys for keyboard movement."
        onKeyDown={moveWithKeyboard}
        onPointerDown={(event) => {
          dragSession.current = startPointerSession(event)
          revealControls()
        }}
        onPointerMove={moveDragSession}
        onPointerUp={finishDragSession}
        onPointerCancel={cancelDragSession}
      >
        <GripIcon />
        <span>Livestream player</span>
      </div>

      <div className="floating-video-controls" aria-label="Video controls">
        <button ref={closeButton} className="floating-close" type="button" onClick={onClose} aria-label="Close floating video" title="Close player">
          <CloseIcon />
        </button>

        <div className="floating-transport">
          <button type="button" onClick={() => seekBy(-10)} disabled={!ready} aria-label="Go back 10 seconds" title="Back 10 seconds">
            <RewindTenIcon />
          </button>
          <button type="button" onClick={() => seekBy(10)} disabled={!ready} aria-label="Go forward 10 seconds" title="Forward 10 seconds">
            <ForwardTenIcon />
          </button>
        </div>
      </div>

      <button
        className="floating-video-resize"
        type="button"
        aria-label="Resize floating video. Use arrow keys for keyboard resizing."
        title="Drag to resize"
        onKeyDown={resizeWithKeyboard}
        onPointerDown={(event) => {
          resizeSession.current = startPointerSession(event)
          revealControls()
        }}
        onPointerMove={(event) => {
          const session = resizeSession.current
          if (!session || session.pointerId !== event.pointerId) return
          const minimumWidth = Math.min(320, window.innerWidth - 16)
          const right = session.startLeft + session.startWidth
          const bottom = session.startTop + session.startHeight
          const left = clamp(
            session.startLeft + event.clientX - session.startX,
            8,
            right - minimumWidth,
          )
          const top = clamp(
            session.startTop + event.clientY - session.startY,
            8,
            bottom - 210,
          )
          setPosition({ left, top })
          setSize({ width: right - left, height: bottom - top })
        }}
        onPointerUp={(event) => {
          if (resizeSession.current?.pointerId === event.pointerId) resizeSession.current = null
        }}
        onPointerCancel={() => { resizeSession.current = null }}
      >
        <ResizeIcon />
      </button>
    </section>
  )
}
