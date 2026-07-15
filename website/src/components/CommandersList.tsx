'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ColorDots, DOT, LABEL } from './ColorDots'
import { formatWinRate } from '@/lib/format'

export interface ComboEntry {
  key: string
  names: string[]
  wins: number
  games: number
  colors: string[]
  image: string | null
}

const COLOR_OPTIONS = ['W', 'U', 'B', 'R', 'G', 'C']

export function CommandersList({ entries }: { entries: ComboEntry[] }) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
  const [minWinRate, setMinWinRate] = useState(0)
  const [maxWinRate, setMaxWinRate] = useState(100)

  function toggleColor(c: string) {
    setSelectedColors(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const filtered = useMemo(() => entries.filter(e => {
    const winRate = e.games > 0 ? (e.wins / e.games) * 100 : 0
    if (winRate < minWinRate || winRate > maxWinRate) return false
    if (selectedColors.size > 0) {
      const entryColors = e.colors.length > 0 ? e.colors : ['C']
      if (!entryColors.some(c => selectedColors.has(c))) return false
    }
    return true
  }), [entries, selectedColors, minWinRate, maxWinRate])

  return (
    <div className="space-y-4">
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
            type="number" min={0} max={100} value={minWinRate}
            onChange={e => setMinWinRate(Math.min(Number(e.target.value), maxWinRate))}
            className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          />
          <span className="text-slate-600 text-xs">–</span>
          <input
            type="number" min={0} max={100} value={maxWinRate}
            onChange={e => setMaxWinRate(Math.max(Number(e.target.value), minWinRate))}
            className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          />
        </div>

        <div className="ml-auto flex items-center gap-0.5 bg-slate-800 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${view === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${view === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            List
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No commanders match these filters.
        </div>
      )}

      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(entry => {
            const winRate = entry.games > 0 ? entry.wins / entry.games : 0
            return (
              <Link
                key={entry.key}
                href={`/commanders/${encodeURIComponent(entry.names[0])}`}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 hover:bg-slate-800/50 transition-colors flex gap-3"
              >
                {entry.image ? (
                  <div className="shrink-0 w-12 h-[66px] rounded overflow-hidden bg-slate-800">
                    <img src={entry.image} alt={entry.key} className="w-full h-full object-cover object-top" />
                  </div>
                ) : (
                  <div className="shrink-0 w-12 h-[66px] rounded bg-slate-800 flex items-center justify-center text-slate-600 text-xl">⚔️</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white text-sm leading-tight line-clamp-2">{entry.key}</div>
                  <div className="mt-1.5"><ColorDots colors={entry.colors.length > 0 ? entry.colors : null} /></div>
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
      ) : (
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
              {filtered.map(entry => {
                const winRate = entry.games > 0 ? entry.wins / entry.games : 0
                return (
                  <tr key={entry.key} className="relative border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/commanders/${encodeURIComponent(entry.names[0])}`}
                        className="text-white hover:text-violet-400 font-medium after:absolute after:inset-0"
                      >
                        {entry.key}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><ColorDots colors={entry.colors.length > 0 ? entry.colors : null} /></td>
                    <td className="text-right px-3 py-2.5 text-emerald-400 font-mono">{entry.wins}</td>
                    <td className="text-right px-3 py-2.5 text-red-400 font-mono">{entry.games - entry.wins}</td>
                    <td className="text-right px-4 py-2.5 text-slate-300 font-mono">{formatWinRate(winRate)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
