import { ACHIEVEMENT_REFERENCE } from '@/lib/achievements'
import { ICON } from '@/components/AchievementPill'
import { ChampionCrown, CHAMPION_VARIANT } from '@/components/ChampionCrown'
import { TintedEmoji, tintFor } from '@/components/TintedEmoji'
import { LOSS_TIER_EMOJI } from '@/lib/lossTiers'
import { RollBadge, rollShapeFor } from '@/components/RollBadge'

function iconFor(id: string): string {
  if (id.startsWith('wins-')) return '🏆'
  if (LOSS_TIER_EMOJI[id]) return LOSS_TIER_EMOJI[id]
  if (id.startsWith('losses-')) return '💀'
  if (id.startsWith('games-')) return '🎖️'
  return ICON[id] ?? '🏆'
}

export default function AchievementsPage() {
  const categories: string[] = []
  const byCategory: Record<string, typeof ACHIEVEMENT_REFERENCE> = {}
  for (const a of ACHIEVEMENT_REFERENCE) {
    if (!byCategory[a.category]) { byCategory[a.category] = []; categories.push(a.category) }
    byCategory[a.category].push(a)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <p className="text-slate-400 text-sm mt-1">Every badge earnable in the pod</p>
      </div>

      {categories.map(cat => (
        <section key={cat}>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{cat}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {byCategory[cat].map(a => (
              <div key={a.id} className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">
                <span className="mt-0.5 shrink-0">
                  {CHAMPION_VARIANT[a.id] ? (
                    <ChampionCrown variant={CHAMPION_VARIANT[a.id]} size={20} />
                  ) : rollShapeFor(a.id) ? (
                    <RollBadge id={a.id} size={20} />
                  ) : tintFor(a.id) ? (
                    <TintedEmoji emoji={iconFor(a.id)} tint={tintFor(a.id)!} size={18} />
                  ) : (
                    <span className="text-lg leading-none">{iconFor(a.id)}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
