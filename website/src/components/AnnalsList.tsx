'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, formatTime, formatDuration, commanderLabel } from '@/lib/format'
import { AchievementPill } from './AchievementPill'
import { ColorDots } from './ColorDots'
import type { GameData } from '@/lib/types'

export function AnnalsList({ games }: { games: GameData[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {games.map((game, i) => {
        const isOpen = openIndex === i
        const winner = game.participants.find(p => p.didWin)

        return (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
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
                    <span className="text-emerald-400">{winner.playerName} won</span>
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
  )
}
