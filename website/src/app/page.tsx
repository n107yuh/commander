import Link from 'next/link'
import { loadData, formatDate, formatWinRate, commanderLabel, playerStandings } from '@/lib/data'
import { ColorDots } from '@/components/ColorDots'

export default function Dashboard() {
  const data = loadData()
  const { players, games } = data

  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date))
  const recentGames = sorted.slice(0, 3)
  const standings = playerStandings(players)

  // Mirrors digichampion/irlchampion/ultimateChampion in the Mac app's
  // GamesView.swift: whoever most recently won a remote/in-person game holds
  // that crown until someone else wins one; holding both simultaneously makes
  // you the Ultimate Champion.
  const digiChampion = sorted.find(g => !g.isInPerson && g.participants.some(p => p.didWin))
    ?.participants.find(p => p.didWin)?.playerName ?? null
  const irlChampion = sorted.find(g => g.isInPerson && g.participants.some(p => p.didWin))
    ?.participants.find(p => p.didWin)?.playerName ?? null
  const ultimateChampion = digiChampion && digiChampion === irlChampion ? digiChampion : null

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

      {/* Champion Banner */}
      {(digiChampion || irlChampion) && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          {ultimateChampion ? (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <span className="text-4xl">🌈</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ultimate Champion</span>
              <Link
                href={`/players/${encodeURIComponent(ultimateChampion)}`}
                className="text-lg font-bold text-white hover:text-violet-400"
              >
                {ultimateChampion}
              </Link>
            </div>
          ) : (
            <div className="flex items-start justify-center gap-16">
              {digiChampion && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-3xl">👑</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Digichampion</span>
                  <Link
                    href={`/players/${encodeURIComponent(digiChampion)}`}
                    className="font-semibold text-white hover:text-violet-400"
                  >
                    {digiChampion}
                  </Link>
                </div>
              )}
              {irlChampion && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-3xl">👑</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">IRLchampion</span>
                  <Link
                    href={`/players/${encodeURIComponent(irlChampion)}`}
                    className="font-semibold text-white hover:text-violet-400"
                  >
                    {irlChampion}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <Link href="/annals" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
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
                    {game.participants.filter(p => !p.didWin).map(p => `${p.playerName} (${commanderLabel(p)})`).join(', ')}
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
