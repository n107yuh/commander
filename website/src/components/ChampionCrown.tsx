// The 👑 crown used for the three champion achievements, tinted to match the dashboard banner's
// color scheme: Ultimate Champion cycles through the rainbow (.champion-hue-cycle in globals.css),
// Digital Champion is blue, IRL Champion is silver — done via CSS filter since a full-color emoji
// glyph ignores the `color` property.
const FILTER: Record<'blue' | 'silver', string> = {
  blue: 'hue-rotate(165deg) saturate(1.6)',
  silver: 'grayscale(1) brightness(1.35)',
}

export const CHAMPION_VARIANT: Record<string, 'cycle' | 'blue' | 'silver'> = {
  ultimatechampion: 'cycle',
  digitalchampion: 'blue',
  irlchampion: 'silver',
}

export function ChampionCrown({
  variant,
  size = 20,
}: {
  variant: 'cycle' | 'blue' | 'silver'
  size?: number
}) {
  if (variant === 'cycle') {
    return (
      <span className="champion-hue-cycle inline-block leading-none" style={{ fontSize: size }}>
        👑
      </span>
    )
  }
  return (
    <span className="inline-block leading-none" style={{ fontSize: size, filter: FILTER[variant] }}>
      👑
    </span>
  )
}
