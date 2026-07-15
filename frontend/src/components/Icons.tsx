import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
}

export function CompassMark(props: IconProps) {
  return (
    <svg {...baseProps} viewBox="0 0 48 48" {...props}>
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="2.6" fill="currentColor" stroke="none" />
      <path d="M30 12 26 25 18 36 22 23 30 12Z" fill="currentColor" opacity=".22" />
      <path d="M30 12 26 25 18 36 22 23 30 12Z" />
      <path d="M24 3v4M24 41v4M3 24h4M41 24h4" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}

export function CloseIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>
}

export function SearchIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}

export function SunIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6" /></svg>
}

export function MoonIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" /></svg>
}

export function ShuffleIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M16 3h5v5M4 20l5.5-5.5M21 3l-7.4 7.4M15.5 15.5 21 21M16 21h5v-5M4 4l5.6 5.6" /></svg>
}

export function ExternalIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M14 5h5v5M19 5l-8 8" /><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
}

export function LinkIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m9.5 14.5 5-5" /><path d="M7 17H5.5a3.5 3.5 0 0 1 0-7H9M15 7h3.5a3.5 3.5 0 0 1 0 7H15" /></svg>
}

export function MapIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2V6Z" /><path d="M8 4v14M16 6v14" /></svg>
}

export function BookIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></svg>
}

export function FeatherIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M20 4c-7-1-13 2-14 9-.3 2.2.3 4 2 5 1.2.7 3 .7 4.8-.1C17 16.2 19.5 11 20 4Z" /><path d="M4 21c3-5 7-9 13-13M8 16h5M11 12h4" /></svg>
}

export function ArrowIcon({ direction = "right", ...props }: IconProps & { direction?: "left" | "right" }) {
  const transform = direction === "left" ? "rotate(180 12 12)" : undefined
  return <svg {...baseProps} {...props}><g transform={transform}><path d="M5 12h14M14 7l5 5-5 5" /></g></svg>
}

export function CopyIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
}

export function CheckIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m5 12 4 4L19 6" /></svg>
}

export function FloatingVideoIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="12" y="11" width="6" height="5" rx="1" /><path d="m8 9 3 2-3 2V9Z" fill="currentColor" stroke="none" /></svg>
}

function TenSecondLabel() {
  return (
    <>
      <path d="m8 9.8 1.7-1.4v7.2" strokeWidth="1.55" />
      <rect x="11.4" y="8.4" width="4.5" height="7.2" rx="2.25" strokeWidth="1.55" />
    </>
  )
}

export function RewindTenIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M2.75 12A9.25 9.25 0 1 0 5.8 5.15L2.75 8.2" />
      <path d="M2.75 3.4v4.8h4.8" />
      <TenSecondLabel />
    </svg>
  )
}

export function ForwardTenIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21.25 12A9.25 9.25 0 1 1 18.2 5.15l3.05 3.05" />
      <path d="M21.25 3.4v4.8h-4.8" />
      <TenSecondLabel />
    </svg>
  )
}

export function GripIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" /></svg>
}

export function GitHubIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.5.1.6-.2.6-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.6 1 1.6 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.7-1.3-2.2-.3-4.6-1.1-4.6-4.7 0-1 .4-1.9 1-2.5-.1-.3-.4-1.3.1-2.5 0 0 .8-.3 2.6 1a9 9 0 0 1 4.7 0c1.8-1.2 2.6-1 2.6-1 .5 1.2.2 2.2.1 2.5.6.7 1 1.5 1 2.5 0 3.6-2.4 4.4-4.6 4.7.4.3.7.9.7 1.7v2.8c0 .4.2.6.7.5A9.2 9.2 0 0 0 12 2.8Z" fill="currentColor" stroke="none" /></svg>
}

export function ResizeIcon(props: IconProps) {
  return <svg {...baseProps} {...props}><path d="m10 20 10-10M15 20l5-5M5 20 20 5" /></svg>
}
