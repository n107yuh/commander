import Link from 'next/link'
import { loadData, formatDate, formatWinRate, commanderLabel, playerStandings, currentChampions } from '@/lib/data'
import { ColorDots } from '@/components/ColorDots'
import { ClickableRow } from '@/components/ClickableRow'

// Links each name to its player page, joined with " & " (a tie for first can crown several players).
function PlayerLinks({ names }: { names: string[] }) {
  return (
    <>
      {names.map((n, i) => (
        <span key={n}>
          {i > 0 && ' & '}
          <Link href={`/players/${encodeURIComponent(n)}`} className="hover:text-violet-400">{n}</Link>
        </span>
      ))}
    </>
  )
}

export default function Dashboard() {
  const data = loadData()
  const { players, games } = data

  // 1v1 games (exactly 2 players) get their own separate stats on the /1v1 tab and are
  // excluded from every "main" stat here, matching the app.
  const podGames = games.filter(g => g.participants.length !== 2)

  const sorted = [...podGames].sort((a, b) => b.date.localeCompare(a.date))
  const recentGames = sorted.slice(0, 3)
  const standings = playerStandings(players)

  const champions = currentChampions(podGames)
  const hasChampions = champions.digi.length + champions.irl.length + champions.ultimate.length > 0

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
      {hasChampions && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          {champions.ultimate.length > 0 && (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <span className="champion-hue-cycle text-4xl">👑</span>
              <span className="champion-hue-cycle text-amber-400 text-xs font-bold uppercase tracking-wider">Ultimate Champion</span>
              <span className="text-lg font-bold text-white">
                <PlayerLinks names={champions.ultimate} />
              </span>
            </div>
          )}
          {(champions.digi.length > 0 || champions.irl.length > 0) && (
            <div className="flex items-start justify-center gap-16">
              {champions.digi.length > 0 && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-3xl">👑</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Digichampion</span>
                  <span className="font-semibold text-white"><PlayerLinks names={champions.digi} /></span>
                </div>
              )}
              {champions.irl.length > 0 && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-3xl">👑</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">IRLchampion</span>
                  <span className="font-semibold text-white"><PlayerLinks names={champions.irl} /></span>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Player</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium">W</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium">L</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium">T</th>
                    <th className="text-right px-4 py-2.5 text-slate-500 font-medium">Win%</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">No data yet</td></tr>
                  )}
                  {standings.map((p, i) => (
                    <ClickableRow key={p.name} href={`/players/${encodeURIComponent(p.name)}`} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/players/${encodeURIComponent(p.name)}`} className="text-white hover:text-violet-400 font-medium">
                          {p.name}
                        </Link>
                      </td>
                      <td className="text-right px-3 py-3 text-emerald-400 font-mono">{p.wins}</td>
                      <td className="text-right px-3 py-3 text-red-400 font-mono">{p.losses}</td>
                      <td className="text-right px-3 py-3 text-slate-300 font-mono">{p.totalGames}</td>
                      <td className="text-right px-4 py-3 text-slate-300 font-mono">{formatWinRate(p.winRate)}</td>
                    </ClickableRow>
                  ))}
                </tbody>
              </table>
            </div>
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
              const winners = game.participants.filter(p => p.didWin)
              return (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(game.date)} · {game.isInPerson ? '🏠' : '💻'}
                      {winners.length > 1 && ' · Tie'}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {winners.length === 1 && (
                        <ColorDots colors={winners[0].resolvedColorIdentity} />
                      )}
                    </div>
                  </div>
                  {winners.map(winner => (
                    <div key={winner.playerName} className="mt-1 flex items-center gap-2">
                      <span className="text-emerald-400 font-medium text-sm">{winner.playerName}</span>
                      <span className="text-slate-500 text-xs">({commanderLabel(winner)})</span>
                      {winners.length > 1 && <ColorDots colors={winner.resolvedColorIdentity} />}
                    </div>
                  ))}
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
