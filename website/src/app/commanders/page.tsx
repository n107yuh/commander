import { loadData } from '@/lib/data'
import { CommandersList, type ComboEntry } from '@/components/CommandersList'
import type { CommanderData } from '@/lib/types'

interface ComboAccum {
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
  const comboMap: Record<string, ComboAccum> = {}
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
  const sorted: ComboEntry[] = Object.values(comboMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ colorSet, ...e }) => ({ ...e, colors: Array.from(colorSet) }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Commander Records</h1>

      {sorted.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No commanders yet. Export data from the app.
        </div>
      ) : (
        <CommandersList entries={sorted} />
      )}
    </div>
  )
}
