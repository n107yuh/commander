// Nat 20/Nat 1 achievements show the actual rolled number ("20" / "1") in emoji-style bold colored
// text — green for the win variant, red for the loss variant — matching the number-badge style used
// elsewhere (e.g. Nice/A Dick's Width in the Mac app) rather than a die glyph.
const ROLL_SHAPE: Record<string, string> = {
  'nat20-win': '20',
  'nat20-loss': '20',
  'nat1-win': '1',
  'nat1-loss': '1',
}

const ROLL_COLOR: Record<string, string> = {
  'nat20-win': '#34d399', // emerald-400
  'nat1-win': '#34d399',
  'nat20-loss': '#f87171', // red-400
  'nat1-loss': '#f87171',
}

export function rollShapeFor(id: string): string | undefined {
  return ROLL_SHAPE[id]
}

export function RollBadge({ id, size = 18 }: { id: string; size?: number }) {
  const shape = ROLL_SHAPE[id]
  if (!shape) return null
  return (
    <span className="inline-block leading-none font-extrabold" style={{ fontSize: size, color: ROLL_COLOR[id] }}>
      {shape}
    </span>
  )
}
