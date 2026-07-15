import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { CloseIcon } from "./Icons"

export interface LightboxImage {
  src: string
  alt: string
}

interface LightboxProps {
  image: LightboxImage | null
  onClose: () => void
}

export function Lightbox({ image, onClose }: LightboxProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!image) return

    const previousOverflow = document.body.style.overflow
    const application = document.querySelector<HTMLElement>(".app")
    returnFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    document.body.style.overflow = "hidden"
    application?.setAttribute("inert", "")
    closeButton.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "Tab") {
        event.preventDefault()
        closeButton.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      application?.removeAttribute("inert")
      window.removeEventListener("keydown", handleKeyDown)
      if (returnFocus.current?.isConnected) returnFocus.current.focus()
    }
  }, [image, onClose])

  if (!image) return null

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Expanded figure" onClick={onClose}>
      <button ref={closeButton} className="lightbox-close" type="button" onClick={onClose} aria-label="Close expanded figure">
        <CloseIcon />
      </button>
      <figure onClick={(event) => event.stopPropagation()}>
        <img src={image.src} alt={image.alt} />
        {image.alt && <figcaption>{image.alt}</figcaption>}
      </figure>
    </div>,
    document.body,
  )
}
