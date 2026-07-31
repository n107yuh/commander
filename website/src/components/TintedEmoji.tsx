// Recolors an achievement's emoji icon via CSS filter (a full-color emoji glyph ignores `color`).
// grayscale+sepia normalizes any source emoji to one hue baseline before hue-rotating to the target
// color, so it works reliably regardless of how multi-colored the original emoji is.
export type Tint = 'green' | 'brightgreen' | 'red' | 'bronze' | 'silver' | 'gold' | 'platinum'

// Tuned by sampling actual rendered pixel colors (canvas + getImageData) across every emoji these
// tints are applied to, since hue-rotate's effective output hue depends on the source glyph.
const TINT_FILTER: Record<Tint, string> = {
  green: 'grayscale(1) sepia(1) hue-rotate(70deg) saturate(4) brightness(0.9)',
  brightgreen: 'grayscale(1) sepia(1) hue-rotate(70deg) saturate(5) brightness(1.25)',
  red: 'grayscale(1) sepia(1) hue-rotate(-42deg) saturate(12) brightness(0.75)',
  bronze: 'grayscale(1) sepia(1) hue-rotate(-15deg) saturate(3) brightness(0.85)',
  silver: 'grayscale(1) brightness(1.3)',
  gold: 'grayscale(1) sepia(1) hue-rotate(5deg) saturate(3) brightness(1.05)',
  platinum: 'grayscale(0.85) sepia(0.15) hue-rotate(180deg) saturate(0.7) brightness(1.55)',
}

// wins-N / games-N tiers, plus fixed win/loss color pairs (green = good, red = bad).
const TINT_BY_ID: Record<string, Tint> = {
  'wins-5': 'bronze', 'wins-10': 'silver', 'wins-25': 'gold', 'wins-50': 'platinum',
  'games-25': 'bronze', 'games-50': 'silver', 'games-75': 'gold', 'games-100': 'platinum',
  quickwin: 'green', quickloss: 'red',
  'solring1-win': 'brightgreen', 'solring1-loss': 'red',
  milledkill: 'green', milleddeath: 'red',
  poisonkill: 'brightgreen',
}

export function tintFor(id: string): Tint | undefined {
  return TINT_BY_ID[id]
}

export function TintedEmoji({ emoji, tint, size = 18 }: { emoji: string; tint: Tint; size?: number }) {
  return (
    <span className="inline-block leading-none" style={{ fontSize: size, filter: TINT_FILTER[tint] }}>
      {emoji}
    </span>
  )
}
