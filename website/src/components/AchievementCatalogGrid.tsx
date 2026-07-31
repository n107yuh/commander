import { ICON } from './AchievementPill'
import { formatDate } from '@/lib/format'
import type { CatalogAchievement } from '@/lib/achievements'
import { TallyMarks } from './TallyMarks'
import { ColorWheel } from './ColorWheel'
import { ChampionCrown, CHAMPION_VARIANT } from './ChampionCrown'
import { TintedEmoji, tintFor } from './TintedEmoji'
import { LOSS_TIER_EMOJI } from '@/lib/lossTiers'
import { DiceIcon, diceShapeFor } from './DiceIcon'

function iconFor(id: string): string {
  if (id.startsWith('wins-')) return '🏆'
  if (LOSS_TIER_EMOJI[id]) return LOSS_TIER_EMOJI[id]
  if (id.startsWith('losses-')) return '💀'
  if (id.startsWith('games-')) return '🎖️'
  return ICON[id] ?? '🏆'
}

function badgeFor(a: CatalogAchievement) {
  if (CHAMPION_VARIANT[a.id]) {
    return (
      <span className={a.isEarned ? '' : 'opacity-40 grayscale'}>
        <ChampionCrown variant={CHAMPION_VARIANT[a.id]} size={20} />
      </span>
    )
  }
  if (diceShapeFor(a.id)) {
    return (
      <span className={a.isEarned ? '' : 'opacity-40 grayscale'}>
        <DiceIcon id={a.id} size={20} />
      </span>
    )
  }
  const tint = tintFor(a.id)
  if (tint) {
    return (
      <span className={a.isEarned ? '' : 'opacity-40 grayscale'}>
        <TintedEmoji emoji={iconFor(a.id)} tint={tint} size={18} />
      </span>
    )
  }
  if (a.tally !== undefined) {
    return <TallyMarks count={a.tally} tone={a.id.toLowerCase().includes('loss') ? 'loss' : 'win'} />
  }
  if (a.wheel) {
    return (
      <span className={a.isEarned ? '' : 'opacity-40 grayscale'}>
        <ColorWheel segments={a.wheel.segments} completed={a.wheel.completed} size={18} />
      </span>
    )
  }
  return <span className={`text-lg leading-none ${a.isEarned ? '' : 'opacity-25 grayscale'}`}>{iconFor(a.id)}</span>
}

export function AchievementCatalogGrid({ items }: { items: CatalogAchievement[] }) {
  const categories: string[] = []
  const byCategory: Record<string, CatalogAchievement[]> = {}
  for (const a of items) {
    if (!byCategory[a.category]) { byCategory[a.category] = []; categories.push(a.category) }
    byCategory[a.category].push(a)
  }

  return (
    <div className="space-y-5">
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{cat}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {byCategory[cat].map(a => (
              <div
                key={a.id}
                className={`relative group/cat flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                  a.isEarned ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/40 border-slate-800/60'
                }`}
              >
                <span className="mt-0.5 shrink-0">{badgeFor(a)}</span>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${a.isEarned ? 'text-white' : 'text-slate-500'}`}>{a.title}</div>
                  <div className="text-xs text-slate-500 truncate">{a.progress}</div>
                  {a.isEarned && a.earnedDate && (
                    <div className="text-[11px] text-slate-600 mt-0.5">{formatDate(a.earnedDate)}</div>
                  )}
                </div>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cat:block w-56 z-20 rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs leading-snug text-slate-200 shadow-lg whitespace-normal">
                  <span className="font-semibold text-white">{a.title}</span> — {a.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
