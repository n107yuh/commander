import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  loadData, formatDate, formatWinRate, commanderLabel, getPlayerGames, playerAchievementCounts,
  colorMasteryProgress, MONO_COMBOS, DUAL_COMBOS, TRI_COMBOS,
} from '@/lib/data'
import { ColorDots, ColorComboChip } from '@/components/ColorDots'
import { AchievementPill } from '@/components/AchievementPill'

export default function PlayerDetail({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  const { players, games, commanders } = loadData()
  const player = players.find(p => p.name === name)
  if (!player) notFound()

  const playerGames = getPlayerGames(games, name).sort((a, b) => b.date.localeCompare(a.date))

  // Commander usage stats
  const cmdMap: Record<string, { wins: number; games: number; colorIdentity: string[] | null }> = {}
  for (const game of playerGames) {
    const part = game.participants.find(p => p.playerName === name)
    if (!part) continue
    const key = commanderLabel(part)
    if (!cmdMap[key]) {
      const ci = part.resolvedColorIdentity
      cmdMap[key] = { wins: 0, games: 0, colorIdentity: ci }
    }
    cmdMap[key].games++
    if (part.didWin) cmdMap[key].wins++
  }
  const cmdList = Object.entries(cmdMap)
    .map(([label, s]) => ({ label, ...s, winRate: s.games > 0 ? s.wins / s.games : 0 }))
    .sort((a, b) => b.winRate - a.winRate || a.label.localeCompare(b.label))

  // Per-format breakdown
  const iplWins = playerGames.filter(g => g.isInPerson && g.participants.find(p => p.playerName === name)?.didWin).length
  const iplGames = playerGames.filter(g => g.isInPerson).length
  const remWins = playerGames.filter(g => !g.isInPerson && g.participants.find(p => p.playerName === name)?.didWin).length
  const remGames = playerGames.filter(g => !g.isInPerson).length

  const achievementCounts = playerAchievementCounts(games, name)
  const mastery = colorMasteryProgress(games, name)
  const masteryRows = [
    { title: 'Mono-Master', combos: MONO_COMBOS, won: mastery.mono },
    { title: 'Dual-Master', combos: DUAL_COMBOS, won: mastery.dual },
    { title: 'Tri-Master', combos: TRI_COMBOS, won: mastery.tri },
  ]

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/players" className="text-sm text-slate-400 hover:text-white">← Players</Link>

      {/* Header */}
      <div className="flex items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{player.name}</h1>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-emerald-400 font-mono font-semibold">{player.wins}W</span>
            <span className="text-red-400 font-mono font-semibold">{player.losses}L</span>
            <span className="text-slate-400">{player.totalGames} games</span>
            <span className="text-violet-400 font-semibold">{formatWinRate(player.winRate)}</span>
          </div>
        </div>
      </div>

      {/* Format breakdown */}
      {(iplGames > 0 || remGames > 0) && (
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          {iplGames > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-white font-semibold">🏠 {iplWins}–{iplGames - iplWins}</div>
              <div className="text-slate-400 text-xs">In Person</div>
              <div className="text-slate-500 text-xs">{formatWinRate(iplGames > 0 ? iplWins / iplGames : 0)}</div>
            </div>
          )}
          {remGames > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-white font-semibold">💻 {remWins}–{remGames - remWins}</div>
              <div className="text-slate-400 text-xs">Remote</div>
              <div className="text-slate-500 text-xs">{formatWinRate(remGames > 0 ? remWins / remGames : 0)}</div>
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      {player.achievements.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {player.achievements.map(a => <AchievementPill key={a.id} a={a} count={achievementCounts[a.id]} />)}
          </div>
        </section>
      )}

      {/* Color mastery progress */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Color Mastery</h2>
        <div className="space-y-3">
          {masteryRows.map(m => (
            <div key={m.title}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-sm font-medium text-white">{m.title}</span>
                <span className="text-xs text-slate-500">{m.won.size} of {m.combos.length} won</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.combos.map(c => (
                  <ColorComboChip key={c} combo={c} achieved={m.won.has(c)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Commander records */}
      {cmdList.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Commander Records</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Commander</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium">Colors</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium">W</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium">L</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Win%</th>
                </tr>
              </thead>
              <tbody>
                {cmdList.map(c => (
                  <tr key={c.label} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 text-white">
                      {c.label.includes('+') ? (
                        <span>{c.label}</span>
                      ) : (
                        <Link href={`/commanders/${encodeURIComponent(c.label)}`} className="hover:text-violet-400">
                          {c.label}
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-3"><ColorDots colors={c.colorIdentity} /></td>
                    <td className="text-right px-3 py-3 text-emerald-400 font-mono">{c.wins}</td>
                    <td className="text-right px-3 py-3 text-red-400 font-mono">{c.games - c.wins}</td>
                    <td className="text-right px-4 py-3 text-slate-300 font-mono">{formatWinRate(c.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Game history */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Game History</h2>
        <div className="space-y-2">
          {playerGames.map((game, i) => {
            const myPart = game.participants.find(p => p.playerName === name)
            if (!myPart) return null
            const opponents = game.participants.filter(p => p.playerName !== name)
            return (
              <div key={i} className={`bg-slate-900 border rounded-lg px-4 py-3 ${myPart.didWin ? 'border-emerald-900/50' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-sm font-bold shrink-0 ${myPart.didWin ? 'text-emerald-400' : 'text-red-400'}`}>
                      {myPart.didWin ? 'WIN' : 'LOSS'}
                    </span>
                    <span className="text-slate-300 text-sm truncate">{commanderLabel(myPart)}</span>
                    <ColorDots colors={myPart.resolvedColorIdentity} />
                  </div>
                  <span className="text-slate-500 text-xs shrink-0">{formatDate(game.date)} · {game.isInPerson ? '🏠' : '💻'}</span>
                </div>
                {opponents.length > 0 && (
                  <div className="text-slate-500 text-xs mt-1">
                    vs {opponents.map(o => `${o.playerName} (${commanderLabel(o)})`).join(', ')}
                  </div>
                )}
                {myPart.triggeredAchievements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {myPart.triggeredAchievements.map(a => <AchievementPill key={a.id} a={a} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
