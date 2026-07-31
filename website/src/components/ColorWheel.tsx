// Mirrors ColorWheelBadgeView in the Mac app's Achievements.swift: a pie divided into equal
// segments (one per WUBRG color, or 6 with Colorless for Mono-Master), each filled with its MTG
// color once completed, dim otherwise. Colors match ColorDots.tsx's DOT palette (the same colors
// used in the color-mastery tracking section) rather than the Mac app's own mtgColor values, so a
// color reads the same wherever it appears on the website.
const MTG_HEX: Record<string, string> = {
  W: '#FEF3C7', // amber-100
  U: '#3B82F6', // blue-500
  B: '#000000',
  R: '#DC2626', // red-600
  G: '#15803D', // green-700
  C: '#94A3B8', // slate-400
}

const DIM_FILL = 'rgba(148, 163, 184, 0.18)' // Color.secondary.opacity(0.18)

export function ColorWheel({
  segments,
  completed,
  size = 20,
}: {
  segments: string[]
  completed: string[]
  size?: number
}) {
  const completedSet = new Set(completed)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2
  const step = 360 / segments.length

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {segments.map((seg, i) => {
        const startDeg = -90 + i * step
        const endDeg = startDeg + step
        const startRad = (startDeg * Math.PI) / 180
        const endRad = (endDeg * Math.PI) / 180
        const x1 = cx + r * Math.cos(startRad)
        const y1 = cy + r * Math.sin(startRad)
        const x2 = cx + r * Math.cos(endRad)
        const y2 = cy + r * Math.sin(endRad)
        const largeArc = step > 180 ? 1 : 0
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
        const fill = completedSet.has(seg) ? (MTG_HEX[seg] ?? '#94a3b8') : DIM_FILL
        return <path key={seg} d={d} fill={fill} />
      })}
    </svg>
  )
}
