// Mirrors TallyMarksView/TallyGroup in the Mac app's Achievements.swift: groups of four
// vertical strokes with a diagonal slash through the group once a 5th is added.
const TONE_COLOR: Record<'win' | 'loss', string> = {
  win: '#34d399', // emerald-400, matches the wins column elsewhere on the site
  loss: '#f87171', // red-400, matches the losses column elsewhere on the site
}

function TallyGroup({ filled, color }: { filled: number; color: string }) {
  return (
    <div className="relative flex items-center justify-center gap-[1.5px] w-[14px] h-[14px] shrink-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="w-[1.5px] h-[12px] rounded-full"
          style={{ backgroundColor: i < Math.min(filled, 4) ? color : 'transparent' }}
        />
      ))}
      {filled >= 5 && (
        <span
          className="absolute w-[14px] h-[1.5px] rounded-full"
          style={{ backgroundColor: color, transform: 'rotate(-25deg)' }}
        />
      )}
    </div>
  )
}

export function TallyMarks({ count, tone }: { count: number; tone: 'win' | 'loss' }) {
  if (count <= 0) {
    return <span className="text-slate-600 text-[10px] font-semibold min-w-[20px] text-center">—</span>
  }
  const color = TONE_COLOR[tone]
  const groups = Math.floor(count / 5)
  const remainder = count % 5
  return (
    <div className="flex items-center gap-[5px]">
      {Array.from({ length: groups }).map((_, i) => (
        <TallyGroup key={`g${i}`} filled={5} color={color} />
      ))}
      {remainder > 0 && <TallyGroup filled={remainder} color={color} />}
    </div>
  )
}
