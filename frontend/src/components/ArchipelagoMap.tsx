export function ArchipelagoMap() {
  return (
    <svg className="archipelago-map" viewBox="0 0 320 120" aria-hidden="true">
      <path className="map-current" d="M-10 88C46 51 74 112 124 74s76-29 109 1 67-3 102-35" />
      <path className="map-route" d="M20 83C74 22 132 108 185 52s86 19 112-20" />
      <g className="map-islands">
        <path d="M31 76c10-15 27-13 34 0 5 10-5 19-18 18-14 0-24-8-16-18Z" />
        <path d="M110 65c7-12 23-14 31-5 11 13-4 28-19 26-13-1-20-11-12-21Z" />
        <path d="M184 42c7-10 21-8 27 1 5 8-2 16-13 16-11 0-20-8-14-17Z" />
        <path d="M250 73c10-13 30-11 35 2 4 11-10 18-23 15-12-2-19-9-12-17Z" />
      </g>
      <g className="map-boat" transform="translate(151 68)">
        <path d="M0 9h24l-5 7H6L0 9Z" />
        <path d="M11 9V-8l9 13h-9" />
      </g>
      <circle cx="20" cy="83" r="3" />
      <circle cx="297" cy="32" r="3" />
    </svg>
  )
}
