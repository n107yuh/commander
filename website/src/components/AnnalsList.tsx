'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, formatTime, formatDuration, commanderLabel } from '@/lib/format'
import { AchievementPill } from './AchievementPill'
import { ColorDots } from './ColorDots'
import type { GameData } from '@/lib/types'

export function AnnalsList({ games }: { games: GameData[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [winnerFilter, setWinnerFilter] = useState('')
  const [formatFilter, setFormatFilter] = useState<'all' | 'irl' | 'remote'>('all')
  const [commanderFilter, setCommanderFilter] = useState('')

  const winners = useMemo(() => {
    const names = new Set<string>()
    for (const g of games) {
      const w = g.participants.find(p => p.didWin)
      if (w) names.add(w.playerName)
    }
    return Array.from(names).sort()
  }, [games])

  const commanderNames = useMemo(() => {
    const names = new Set<string>()
    for (const g of games) {
      for (const p of g.participants) {
        names.add(p.commanderName)
        if (p.partnerCommanderName) names.add(p.partnerCommanderName)
      }
    }
    return Array.from(names).sort()
  }, [games])

  const filtered = games.filter(g => {
    if (winnerFilter && g.participants.find(p => p.didWin)?.playerName !== winnerFilter) return false
    if (formatFilter === 'irl' && !g.isInPerson) return false
    if (formatFilter === 'remote' && g.isInPerson) return false
    if (commanderFilter && !g.participants.some(p => p.commanderName === commanderFilter || p.partnerCommanderName === commanderFilter)) return false
    return true
  })

  const hasFilters = winnerFilter || formatFilter !== 'all' || commanderFilter

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Winner</span>
          <select
            value={winnerFilter}
            onChange={e => setWinnerFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          >
            <option value="">All</option>
            {winners.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Format</span>
          <select
            value={formatFilter}
            onChange={e => setFormatFilter(e.target.value as 'all' | 'irl' | 'remote')}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          >
            <option value="all">All</option>
            <option value="irl">In Person</option>
            <option value="remote">Remote</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Commander</span>
          <select
            value={commanderFilter}
            onChange={e => setCommanderFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white max-w-[10rem]"
          >
            <option value="">All</option>
            {commanderNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setWinnerFilter(''); setFormatFilter('all'); setCommanderFilter('') }}
            className="text-xs text-slate-500 hover:text-white"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-slate-500">{filtered.length} of {games.length} games</span>
      </div>

      {filtered.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No games match these filters.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((game, i) => {
          const isOpen = openIndex === i
          const winner = game.participants.find(p => p.didWin)

          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/30 transition-colors ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}`}
              >
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="font-medium text-white">{formatDate(game.date)}</span>
                  <span className="text-slate-500 text-xs">{formatTime(game.date)}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">{game.isInPerson ? '🏠 In Person' : '💻 Remote'}</span>
                  {game.durationSeconds && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">⏱ {formatDuration(game.durationSeconds)}</span>
                    </>
                  )}
                  {winner && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-emerald-400">{winner.playerName} won with {commanderLabel(winner)}</span>
                    </>
                  )}
                </div>
                <span className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="space-y-3">
                    {game.participants.map(part => (
                      <div key={part.playerName} className="flex items-start gap-3">
                        <div className="shrink-0 w-28">
                          <Link
                            href={`/players/${encodeURIComponent(part.playerName)}`}
                            className={`text-sm font-medium hover:text-violet-400 ${part.didWin ? 'text-emerald-400' : 'text-slate-300'}`}
                          >
                            {part.playerName}
                          </Link>
                          <div className="flex items-center gap-1 mt-0.5">
                            <ColorDots colors={part.resolvedColorIdentity} />
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5 leading-tight">
                            {commanderLabel(part)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {part.triggeredAchievements.length === 0 ? (
                            <span className="text-slate-700 text-xs">—</span>
                          ) : (
                            part.triggeredAchievements.map(a => <AchievementPill key={a.id} a={a} />)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {game.notes.trim() && (
                    <div className="mt-3 text-slate-500 text-xs border-t border-slate-800 pt-3">
                      {game.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
