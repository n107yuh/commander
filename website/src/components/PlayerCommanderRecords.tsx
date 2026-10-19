'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ColorDots, DOT, LABEL } from './ColorDots'
import { formatWinRate } from '@/lib/format'

export interface PlayerCommanderEntry {
  label: string
  wins: number
  games: number
  winRate: number
  colorIdentity: string[] | null
  // ISO date of the most recent game this player used the commander in.
  lastPlayed: string
}

const COLOR_OPTIONS = ['W', 'U', 'B', 'R', 'G', 'C']

type SortKey = 'winRateDesc' | 'winRateAsc' | 'az' | 'za' | 'gamesDesc' | 'winsDesc' | 'recent'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'winRateDesc', label: 'Win % (high to low)' },
  { value: 'winRateAsc', label: 'Win % (low to high)' },
  { value: 'az', label: 'Alphabetical (A–Z)' },
  { value: 'za', label: 'Alphabetical (Z–A)' },
  { value: 'gamesDesc', label: 'Most games played' },
  { value: 'winsDesc', label: 'Most wins' },
  { value: 'recent', label: 'Most recently played' },
]

// Every sort falls back to the default order (win %, then games, then name) so ties are stable.
function byDefault(a: PlayerCommanderEntry, b: PlayerCommanderEntry): number {
  return b.winRate - a.winRate || b.games - a.games || a.label.localeCompare(b.label)
}

const COMPARATORS: Record<SortKey, (a: PlayerCommanderEntry, b: PlayerCommanderEntry) => number> = {
  winRateDesc: byDefault,
  winRateAsc: (a, b) => a.winRate - b.winRate || b.games - a.games || a.label.localeCompare(b.label),
  az: (a, b) => a.label.localeCompare(b.label),
  za: (a, b) => b.label.localeCompare(a.label),
  gamesDesc: (a, b) => b.games - a.games || byDefault(a, b),
  winsDesc: (a, b) => b.wins - a.wins || byDefault(a, b),
  recent: (a, b) => b.lastPlayed.localeCompare(a.lastPlayed) || byDefault(a, b),
}

export function PlayerCommanderRecords({ entries }: { entries: PlayerCommanderEntry[] }) {
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
  // Raw strings so the fields can be fully cleared while typing (see CommandersList).
  const [minWinRateStr, setMinWinRateStr] = useState('0')
  const [maxWinRateStr, setMaxWinRateStr] = useState('100')
  const [sortKey, setSortKey] = useState<SortKey>('winRateDesc')
  const minWinRate = minWinRateStr === '' ? 0 : Number(minWinRateStr)
  const maxWinRate = maxWinRateStr === '' ? 100 : Number(maxWinRateStr)

  function toggleColor(c: string) {
    setSelectedColors(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const shown = useMemo(() => entries
    .filter(e => {
      const winRate = e.winRate * 100
      if (winRate < minWinRate || winRate > maxWinRate) return false
      if (selectedColors.size > 0) {
        // Colorless commanders count as "C"; commanders with unresolved colors match no color filter.
        const entryColors = e.colorIdentity === null
          ? new Set<string>()
          : new Set(e.colorIdentity.length > 0 ? e.colorIdentity : ['C'])
        if (!Array.from(selectedColors).every(c => entryColors.has(c))) return false
      }
      return true
    })
    .sort(COMPARATORS[sortKey]), [entries, selectedColors, minWinRate, maxWinRate, sortKey])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-0.5">Color</span>
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => toggleColor(c)}
              title={LABEL[c]}
              className={`w-5 h-5 rounded-full shrink-0 ${DOT[c]} transition-shadow ${
                selectedColors.has(c) ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900' : 'opacity-50 hover:opacity-90'
              }`}
            />
          ))}
          {selectedColors.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedColors(new Set())}
              className="text-xs text-slate-500 hover:text-white ml-1"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Win%</span>
          <input
            type="number" min={0} max={100} value={minWinRateStr}
            onChange={e => setMinWinRateStr(e.target.value)}
            onBlur={() => setMinWinRateStr(String(Math.min(Math.max(minWinRate, 0), 100)))}
            className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          />
          <span className="text-slate-600 text-xs">–</span>
          <input
            type="number" min={0} max={100} value={maxWinRateStr}
            onChange={e => setMaxWinRateStr(e.target.value)}
            onBlur={() => setMaxWinRateStr(String(Math.min(Math.max(maxWinRate, 0), 100)))}
            className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:ml-auto">
          <span className="text-xs text-slate-500">Sort by</span>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
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
              {shown.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No commanders match these filters.</td></tr>
              )}
              {shown.map(c => (
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
      </div>
    </div>
  )
}
