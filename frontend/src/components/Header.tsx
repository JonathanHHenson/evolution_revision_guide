import { GITHUB_REPOSITORY_URL } from "../lib/github"
import { CloseIcon, CompassMark, FloatingVideoIcon, GitHubIcon, MenuIcon, MoonIcon, SunIcon } from "./Icons"

interface HeaderProps {
  theme: "light" | "dark"
  onToggleTheme: () => void
  navigationOpen: boolean
  onToggleNavigation: () => void
  floatingVideoEnabled: boolean
  onToggleFloatingVideo: () => void
  progress: number
}

export function Header({
  theme,
  onToggleTheme,
  navigationOpen,
  onToggleNavigation,
  floatingVideoEnabled,
  onToggleFloatingVideo,
  progress,
}: HeaderProps) {
  return (
    <header className="site-header">
      <div className="reading-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <button
        id="navigation-toggle"
        className="icon-button mobile-menu"
        type="button"
        onClick={onToggleNavigation}
        aria-label={`${navigationOpen ? "Close" : "Open"} field journal navigation`}
        aria-controls="field-journal-navigation"
        aria-expanded={navigationOpen}
      >
        {navigationOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
      <a className="brand" href="#/" aria-label="Evolution Field Guide home">
        <CompassMark className="brand-mark" />
        <span>
          <strong>Evolution Field Guide</strong>
          <small>A source-linked voyage</small>
        </span>
      </a>
      <div className="header-actions">
        <a
          className="github-link"
          href={GITHUB_REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View the project on GitHub"
        >
          <GitHubIcon />
          <span>GitHub</span>
        </a>
        <button
          className="floating-video-toggle"
          type="button"
          onClick={onToggleFloatingVideo}
          aria-pressed={floatingVideoEnabled}
          title="When enabled, timestamp links open in a movable player. Opening a video connects to YouTube."
        >
          <FloatingVideoIcon />
          <span><strong>Floating video</strong><small>{floatingVideoEnabled ? "On" : "Off"}</small></span>
          <span className="toggle-track" aria-hidden="true"><span /></span>
        </button>
        <button className="icon-button theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "night watch" : "daylight"} theme`}>
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </header>
  )
}
