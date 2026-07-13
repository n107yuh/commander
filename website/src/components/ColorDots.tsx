const DOT: Record<string, string> = {
  W: 'bg-amber-100',
  U: 'bg-blue-500',
  B: 'bg-slate-600 ring-1 ring-slate-400',
  R: 'bg-red-600',
  G: 'bg-green-700',
  C: 'bg-slate-400',
}

const LABEL: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
}

interface Props {
  colors: string[] | null
  size?: 'sm' | 'md'
}

export function ColorDots({ colors, size = 'sm' }: Props) {
  if (!colors || colors.length === 0) {
    return <span className="text-slate-500 text-xs">—</span>
  }
  const dim = size === 'md' ? 'w-4 h-4' : 'w-2.5 h-2.5'
  return (
    <div className="flex gap-1 items-center" title={colors.map(c => LABEL[c] ?? c).join(', ')}>
      {colors.map(c => (
        <div key={c} className={`${dim} rounded-full shrink-0 ${DOT[c] ?? 'bg-slate-400'}`} />
      ))}
    </div>
  )
}
