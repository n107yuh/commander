export const DOT: Record<string, string> = {
  W: 'bg-amber-100',
  U: 'bg-blue-500',
  B: 'bg-black ring-1 ring-slate-700',
  R: 'bg-red-600',
  G: 'bg-green-700',
  C: 'bg-slate-400',
}

export const LABEL: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']

interface Props {
  colors: string[] | null
  size?: 'sm' | 'md'
}

export function ColorDots({ colors, size = 'sm' }: Props) {
  if (!colors || colors.length === 0) {
    return <span className="text-slate-500 text-xs">—</span>
  }
  const sorted = [...colors].sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b))
  const dim = size === 'md' ? 'w-4 h-4' : 'w-2.5 h-2.5'
  return (
    <div className="flex gap-1 items-center" title={sorted.map(c => LABEL[c] ?? c).join(', ')}>
      {sorted.map(c => (
        <div key={c} className={`${dim} rounded-full shrink-0 ${DOT[c] ?? 'bg-slate-400'}`} />
      ))}
    </div>
  )
}

// A small chip for a mono/dual/tri color combo (e.g. "W", "WU", "BRG"), used to
// show progress toward color-mastery achievements — dim/outlined when not yet won.
// Tooltip shows the commander used to win it once achieved, otherwise the colors.
export function ColorComboChip({ combo, achieved, commander }: { combo: string; achieved: boolean; commander?: string }) {
  const letters = combo === 'C' ? ['C'] : combo.split('')
  const colorNames = letters.map(c => LABEL[c] ?? c).join(', ')
  const tooltip = achieved && commander ? commander : colorNames
  return (
    <div className="relative group/chip inline-block">
      <div
        className={`flex items-center gap-0.5 rounded-md border px-1.5 py-1 ${
          achieved ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800 opacity-40'
        }`}
      >
        {letters.map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[c] ?? 'bg-slate-400'}`} />
        ))}
      </div>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/chip:block whitespace-nowrap z-20 rounded-md bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-200 shadow-lg">
        {tooltip}
      </span>
    </div>
  )
}
