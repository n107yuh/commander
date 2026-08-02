import { ACHIEVEMENT_REFERENCE } from '@/lib/achievements'
import { ICON } from '@/components/AchievementPill'
import { ChampionCrown, CHAMPION_VARIANT } from '@/components/ChampionCrown'
import { TintedEmoji, tintFor } from '@/components/TintedEmoji'
import { LOSS_TIER_EMOJI } from '@/lib/lossTiers'
import { RollBadge, rollShapeFor } from '@/components/RollBadge'
import { ColorWheel } from '@/components/ColorWheel'
import { TallyMarks } from '@/components/TallyMarks'
import { EmptyDeck, milledColorFor } from '@/components/EmptyDeck'

// This page is a static reference (no earned/unearned state), so color-mastery
// wheels always render fully filled in, as if the achievement had been popped.
const FULL_WHEEL: Record<string, { segments: string[]; completed: string[] }> = {
  monomaster: { segments: ['W', 'U', 'B', 'R', 'G', 'C'], completed: ['W', 'U', 'B', 'R', 'G', 'C'] },
  dualmaster: { segments: ['W', 'U', 'B', 'R', 'G'], completed: ['W', 'U', 'B', 'R', 'G'] },
  trimaster: { segments: ['W', 'U', 'B', 'R', 'G'], completed: ['W', 'U', 'B', 'R', 'G'] },
  tastetherainbow: { segments: ['W', 'U', 'B', 'R', 'G'], completed: ['W', 'U', 'B', 'R', 'G'] },
}

// Streaks have no live count on this static reference page, so just show the same
// "—" dash TallyMarks already renders for an inactive streak elsewhere on the site.
const STREAK_IDS = new Set(['winstreak', 'bestwinstreak', 'lossstreak', 'bestlossstreak'])

function iconFor(id: string): string {
  if (id.startsWith('wins-')) return '🏆'
  if (LOSS_TIER_EMOJI[id]) return LOSS_TIER_EMOJI[id]
  if (id.startsWith('losses-')) return '💀'
  if (id.startsWith('games-')) return '🎖️'
  if (id.startsWith('turns-')) return '🔄'
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
                  ) : STREAK_IDS.has(a.id) ? (
                    <TallyMarks count={0} tone="win" />
                  ) : rollShapeFor(a.id) ? (
                    <RollBadge id={a.id} size={20} />
                  ) : milledColorFor(a.id) ? (
                    <EmptyDeck color={milledColorFor(a.id)!} size={22} />
                  ) : FULL_WHEEL[a.id] ? (
                    <ColorWheel segments={FULL_WHEEL[a.id].segments} completed={FULL_WHEEL[a.id].completed} size={18} />
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
