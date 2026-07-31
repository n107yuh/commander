// Milled 'em To A Pulp / Library Card: Declined — a dashed-outline card silhouette standing in for
// an emptied-out library, colored directly (no emoji filter trick needed since it's a plain SVG).
const MILLED_COLOR: Record<string, string> = {
  milledkill: '#34d399', // emerald-400
  milleddeath: '#f87171', // red-400
}

export function milledColorFor(id: string): string | undefined {
  return MILLED_COLOR[id]
}

// Four independent edges rather than one <rect> — a single dashed rect path just wraps its dash
// pattern continuously around the perimeter with no regard for where the corners land, so dashes
// cut across corners at odd offsets. Each edge here starts its own dash pattern fresh at its own
// corner, and 2/1 is chosen because it divides evenly into both the width (12) and height (18), so
// every edge ends exactly on a dash boundary too.
const LEFT = 4
const RIGHT = 16
const TOP = 1
const BOTTOM = 19
const DASH = '2 1'

export function EmptyDeck({ color, size = 18 }: { color: string; size?: number }) {
  const common = { stroke: color, strokeWidth: 1.2, strokeDasharray: DASH }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
      <line x1={LEFT} y1={TOP} x2={RIGHT} y2={TOP} {...common} />
      <line x1={RIGHT} y1={TOP} x2={RIGHT} y2={BOTTOM} {...common} />
      <line x1={RIGHT} y1={BOTTOM} x2={LEFT} y2={BOTTOM} {...common} />
      <line x1={LEFT} y1={BOTTOM} x2={LEFT} y2={TOP} {...common} />
    </svg>
  )
}
