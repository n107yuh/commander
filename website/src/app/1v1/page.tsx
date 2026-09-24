import Link from 'next/link'
import { loadData, formatWinRate } from '@/lib/data'
import { ClickableRow } from '@/components/ClickableRow'
import { CommandersList, type ComboEntry } from '@/components/CommandersList'
import type { CommanderData } from '@/lib/types'

interface StandingsEntry {
  name: string
  wins: number
  losses: number
  games: number
  winRate: number
}

interface Matchup {
  playerA: string
  playerB: string
  winsA: number
  winsB: number
  total: number
}

interface ComboAccum {
  key: string
  names: string[]
  wins: number
  games: number
  colorSet: Set<string>
  image: string | null
}

export default function OneVOnePage() {
  const { commanders, games } = loadData()

  // 1v1 games are exactly 2 players — kept as their own separate universe of stats,
  // excluded from every other page's "main" numbers. Checks for a 1v1 game are simply
  // "exactly 2 participants", same rule the Mac app uses.
  const oneVOneGames = games.filter(g => g.participants.length === 2)

  const standingsMap: Record<string, StandingsEntry> = {}
  for (const game of oneVOneGames) {
    for (const p of game.participants) {
      const entry = standingsMap[p.playerName] ?? (standingsMap[p.playerName] = { name: p.playerName, wins: 0, losses: 0, games: 0, winRate: 0 })
      entry.games++
      if (p.didWin) entry.wins++
      else entry.losses++
    }
  }
  const standings = Object.values(standingsMap)
    .map(e => ({ ...e, winRate: e.games > 0 ? e.wins / e.games : 0 }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || a.name.localeCompare(b.name))

  const matchupMap: Record<string, Matchup> = {}
  for (const game of oneVOneGames) {
    const [p0, p1] = game.participants
    if (!p0 || !p1) continue
    const [first, second] = p0.playerName.localeCompare(p1.playerName) <= 0 ? [p0, p1] : [p1, p0]
    const key = `${first.playerName}::${second.playerName}`
    const m = matchupMap[key] ?? (matchupMap[key] = { playerA: first.playerName, playerB: second.playerName, winsA: 0, winsB: 0, total: 0 })
    if (first.didWin) m.winsA++
    if (second.didWin) m.winsB++
    m.total++
  }
  const matchups = Object.values(matchupMap).sort((a, b) => b.total - a.total)

  const comboMap: Record<string, ComboAccum> = {}
  for (const game of oneVOneGames) {
    for (const part of game.participants) {
      const names = [part.commanderName, part.partnerCommanderName]
        .filter((n): n is string => !!n)
        .sort()
      const key = names.join(' + ')
      if (!comboMap[key]) {
        const cards = names
          .map(n => commanders.find(c => c.name === n))
          .filter((c): c is CommanderData => !!c)
        comboMap[key] = {
          key,
          names,
          wins: 0,
          games: 0,
          colorSet: new Set(),
          image: cards.find(c => c.imageURLs?.[0])?.imageURLs?.[0] ?? null,
        }
      }
      comboMap[key].games++
      if (part.didWin) comboMap[key].wins++
      for (const c of part.resolvedColorIdentity ?? []) comboMap[key].colorSet.add(c)
    }
  }
  const commanderEntries: ComboEntry[] = Object.values(comboMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ colorSet, ...e }) => ({ ...e, colors: Array.from(colorSet) }))

  if (oneVOneGames.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">1v1</h1>
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No 1v1 games yet. A game with exactly 2 players will show up here, separate from the pod&apos;s main stats.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">1v1</h1>
        <p className="text-slate-400 text-sm mt-1">
          Head-to-head games — kept separate from the pod&apos;s main standings, records, and achievements.
        </p>
      </div>

      {/* Standings */}
      <section>
        <h2 className="font-semibold text-slate-300 uppercase text-xs tracking-wider mb-3">Standings</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Player</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">W</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">L</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">T</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Win%</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <ClickableRow key={s.name} href={`/players/${encodeURIComponent(s.name)}`} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/players/${encodeURIComponent(s.name)}`} className="text-white hover:text-violet-400 font-semibold">
                        {s.name}
                      </Link>
                    </td>
                    <td className="text-right px-3 py-3 text-emerald-400 font-mono font-medium">{s.wins}</td>
                    <td className="text-right px-3 py-3 text-red-400 font-mono font-medium">{s.losses}</td>
                    <td className="text-right px-3 py-3 text-slate-300 font-mono">{s.games}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`font-mono font-semibold ${s.winRate >= 0.5 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {formatWinRate(s.winRate)}
                      </span>
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Head to head */}
      <section>
        <h2 className="font-semibold text-slate-300 uppercase text-xs tracking-wider mb-3">Head to Head</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Matchup</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium">Games</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Record</th>
                </tr>
              </thead>
              <tbody>
                {matchups.map(m => (
                  <tr key={`${m.playerA}::${m.playerB}`} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-4 py-2.5 text-white">
                      <Link href={`/players/${encodeURIComponent(m.playerA)}`} className="hover:text-violet-400">{m.playerA}</Link>
                      <span className="text-slate-500 mx-1.5">vs</span>
                      <Link href={`/players/${encodeURIComponent(m.playerB)}`} className="hover:text-violet-400">{m.playerB}</Link>
                    </td>
                    <td className="text-right px-3 py-2.5 text-slate-300 font-mono">{m.total}</td>
                    <td className="text-right px-4 py-2.5 text-slate-300 font-mono">{m.winsA}–{m.winsB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Commander records */}
      {commanderEntries.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-300 uppercase text-xs tracking-wider mb-3">Commander Records</h2>
          <CommandersList entries={commanderEntries} />
        </section>
      )}
    </div>
  )
}
