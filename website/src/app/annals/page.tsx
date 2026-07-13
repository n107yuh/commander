import { loadData } from '@/lib/data'
import { AnnalsList } from '@/components/AnnalsList'

export default function AnnalsPage() {
  const { games } = loadData()
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date))

  // Only games that have at least one triggered achievement
  const annalGames = sorted.filter(g =>
    g.participants.some(p => p.triggeredAchievements.length > 0)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">The Annals</h1>
        <p className="text-slate-400 text-sm mt-1">Notable moments, game by game</p>
      </div>

      {annalGames.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No notable moments yet. Export data from the app after some games.
        </div>
      )}

      <AnnalsList games={sorted} />
    </div>
  )
}
