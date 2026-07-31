// Nat 20/Nat 1 achievements share a single die emoji today; swap in Unicode die-face glyphs
// (⚅ six-pips for nat20, ⚀ one-pip for nat1) so the roll itself is visually distinct, then color
// win green / loss red. Unlike the achievement emoji elsewhere, these are plain text glyphs (not
// full-color emoji), so a normal CSS `color` works directly instead of needing a filter trick.
const DICE_SHAPE: Record<string, string> = {
  'nat20-win': '⚅',
  'nat20-loss': '⚅',
  'nat1-win': '⚀',
  'nat1-loss': '⚀',
}

const DICE_COLOR: Record<string, string> = {
  'nat20-win': '#34d399', // emerald-400
  'nat1-win': '#34d399',
  'nat20-loss': '#f87171', // red-400
  'nat1-loss': '#f87171',
}

export function diceShapeFor(id: string): string | undefined {
  return DICE_SHAPE[id]
}

export function DiceIcon({ id, size = 18 }: { id: string; size?: number }) {
  const shape = DICE_SHAPE[id]
  if (!shape) return null
  return (
    <span className="inline-block leading-none font-bold" style={{ fontSize: size, color: DICE_COLOR[id] }}>
      {shape}
    </span>
  )
}
