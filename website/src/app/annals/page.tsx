import Link from 'next/link'
import { loadData, formatDate, formatTime, formatDuration, commanderLabel } from '@/lib/data'
import { AchievementPill } from '@/components/AchievementPill'
import { ColorDots } from '@/components/ColorDots'

export default function AnnalsPage() {
  const { games } = loadData()
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date))

  // Only games that have at least one triggered achievement
  const annalGames = sorted.filter(g =>
    g.participants.some(p => p.triggeredAchievements.length > 0)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">The Annals</h1>
        <p className="text-slate-400 text-sm mt-1">Notable moments, game by game</p>
      </div>

      {annalGames.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No notable moments yet. Export data from the app after some games.
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((game, i) => {
          const partsWithAchievements = game.participants.filter(p => p.triggeredAchievements.length > 0)
          const allParticipants = game.participants
          const winner = game.participants.find(p => p.didWin)

          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
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
              </div>

              {/* All participants with their achievements */}
              <div className="space-y-3">
                {allParticipants.map(part => (
                  <div key={part.playerName} className="flex items-start gap-3">
                    <div className="shrink-0 w-28">
                      <Link href={`/players/${encodeURIComponent(part.playerName)}`}
                        className={`text-sm font-medium hover:text-violet-400 ${part.didWin ? 'text-emerald-400' : 'text-slate-300'}`}>
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

              {/* Notes */}
              {game.notes.trim() && (
                <div className="mt-3 text-slate-500 text-xs border-t border-slate-800 pt-3">
                  {game.notes}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
