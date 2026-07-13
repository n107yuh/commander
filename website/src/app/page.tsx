import Link from 'next/link'
import { loadData, formatDate, formatWinRate, commanderLabel, playerStandings } from '@/lib/data'
import { ColorDots } from '@/components/ColorDots'

export default function Dashboard() {
  const data = loadData()
  const { players, commanders, games } = data

  const totalInPerson = games.filter(g => g.isInPerson).length
  const totalRemote = games.filter(g => !g.isInPerson).length
  const recentGames = [...games].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  const standings = playerStandings(players)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Commander Tracker</h1>
          {data.exportedAt && (
            <p className="text-slate-400 text-sm mt-1">
              Last updated {formatDate(data.exportedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Pod stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Games', value: games.length },
          { label: 'Players', value: players.length },
          { label: 'Commanders', value: commanders.length },
          { label: 'In Person / Remote', value: `${totalInPerson} / ${totalRemote}` },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-slate-400 text-sm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Player Standings */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-300 uppercase text-xs tracking-wider">Player Standings</h2>
            <Link href="/players" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">#</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Player</th>
                  <th className="text-right px-3 py-2.5 text-slate-500 font-medium">W</th>
                  <th className="text-right px-3 py-2.5 text-slate-500 font-medium">L</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-medium">Win%</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-sm">No data yet</td></tr>
                )}
                {standings.map((p, i) => (
                  <tr key={p.name} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/players/${encodeURIComponent(p.name)}`} className="text-white hover:text-violet-400 font-medium">
                        {p.name}
                      </Link>
                    </td>
                    <td className="text-right px-3 py-3 text-emerald-400 font-mono">{p.wins}</td>
                    <td className="text-right px-3 py-3 text-red-400 font-mono">{p.losses}</td>
                    <td className="text-right px-4 py-3 text-slate-300 font-mono">{formatWinRate(p.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Games */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-300 uppercase text-xs tracking-wider">Recent Games</h2>
            <Link href="/games" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentGames.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-6 text-center text-slate-500 text-sm">No games yet</div>
            )}
            {recentGames.map((game, i) => {
              const winner = game.participants.find(p => p.didWin)
              return (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(game.date)} · {game.isInPerson ? '🏠' : '💻'}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {winner && (
                        <ColorDots colors={winner.resolvedColorIdentity} />
                      )}
                    </div>
                  </div>
                  {winner && (
                    <div className="mt-1">
                      <span className="text-emerald-400 font-medium text-sm">{winner.playerName}</span>
                      <span className="text-slate-500 text-xs ml-1.5">({commanderLabel(winner)})</span>
                    </div>
                  )}
                  <div className="text-slate-500 text-xs mt-0.5">
                    {game.participants.filter(p => !p.didWin).map(p => p.playerName).join(', ')}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
