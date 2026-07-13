import Link from 'next/link'
import { loadData, formatWinRate, playerStandings, currentWinStreak, currentLossStreak } from '@/lib/data'

export default function PlayersPage() {
  const { players, games } = loadData()
  const standings = playerStandings(players)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Player Records</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/30">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">#</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Player</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">W</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">L</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Games</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Win%</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No players yet. Export data from the app.</td></tr>
            )}
            {standings.map((p, i) => {
              const winStreak = currentWinStreak(games, p.name)
              const lossStreak = currentLossStreak(games, p.name)
              return (
                <tr key={p.name} className="relative border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${encodeURIComponent(p.name)}`}
                      className="text-white hover:text-violet-400 font-semibold after:absolute after:inset-0"
                    >
                      {p.name}
                    </Link>
                    {winStreak > 0 && (
                      <span className="ml-2 text-sm text-orange-400 font-mono">🔥{winStreak}</span>
                    )}
                    {lossStreak > 0 && (
                      <span className="ml-2 text-sm text-slate-500 font-mono">❄️{lossStreak}</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-3 text-emerald-400 font-mono font-medium">{p.wins}</td>
                  <td className="text-right px-4 py-3 text-red-400 font-mono font-medium">{p.losses}</td>
                  <td className="text-right px-4 py-3 text-slate-300 font-mono">{p.totalGames}</td>
                  <td className="text-right px-4 py-3">
                    <span className={`font-mono font-semibold ${p.winRate >= 0.5 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {formatWinRate(p.winRate)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
