import Link from 'next/link'
import { loadData, formatWinRate } from '@/lib/data'
import { ColorDots } from '@/components/ColorDots'
import type { CommanderData } from '@/lib/types'

interface ComboEntry {
  key: string
  names: string[]
  wins: number
  games: number
  colorSet: Set<string>
  image: string | null
}

export default function CommandersPage() {
  const { commanders, games } = loadData()

  // Group by the exact commander combo used in each participation, mirroring
  // CommanderRecordsAggregator.entries(from:) in the Mac app's Stats.swift, so
  // partnered commanders appear as one combined entry instead of two separate
  // ones. A commander played both solo and with a partner in different games
  // gets a separate entry for each combo, same as the app.
  //
  // Colors come from each participant's resolvedColorIdentity, not the static
  // CommanderData.colorIdentity — some commanders (e.g. Clara Oswald) are
  // printed colorless but get a chosen color identity per game, which only
  // shows up on the participant record.
  const comboMap: Record<string, ComboEntry> = {}
  for (const game of games) {
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
  const sorted = Object.values(comboMap).sort((a, b) => a.key.localeCompare(b.key))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Commander Records</h1>

      {sorted.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No commanders yet. Export data from the app.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(entry => {
          const winRate = entry.games > 0 ? entry.wins / entry.games : 0
          return (
            <Link
              key={entry.key}
              href={`/commanders/${encodeURIComponent(entry.names[0])}`}
              className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 hover:bg-slate-800/50 transition-colors flex gap-3"
            >
              {/* Card thumbnail */}
              {entry.image ? (
                <div className="shrink-0 w-12 h-[66px] rounded overflow-hidden bg-slate-800">
                  <img src={entry.image} alt={entry.key} className="w-full h-full object-cover object-top" />
                </div>
              ) : (
                <div className="shrink-0 w-12 h-[66px] rounded bg-slate-800 flex items-center justify-center text-slate-600 text-xl">⚔️</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white text-sm leading-tight line-clamp-2">{entry.key}</div>
                <div className="mt-1.5"><ColorDots colors={entry.colorSet.size > 0 ? Array.from(entry.colorSet) : null} /></div>
                <div className="flex gap-2 mt-1.5 text-xs font-mono">
                  <span className="text-emerald-400">{entry.wins}W</span>
                  <span className="text-red-400">{entry.games - entry.wins}L</span>
                  <span className="text-slate-400">{formatWinRate(winRate)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
