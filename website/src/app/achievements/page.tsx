import { ACHIEVEMENT_REFERENCE } from '@/lib/achievements'
import { ICON } from '@/components/AchievementPill'

function iconFor(id: string): string {
  if (id.startsWith('wins-')) return '🏆'
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
                <span className="text-lg leading-none mt-0.5 shrink-0">{iconFor(a.id)}</span>
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
