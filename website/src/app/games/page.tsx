import Link from 'next/link'
import { loadData, formatDate, formatDuration, commanderLabel } from '@/lib/data'
import { ColorDots } from '@/components/ColorDots'

export default function GamesPage() {
  const { games } = loadData()
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Game Log</h1>
        <span className="text-slate-400 text-sm">{games.length} games total</span>
      </div>

      {sorted.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No games yet. Export data from the app.
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((game, i) => {
          const winner = game.participants.find(p => p.didWin)
          const losers = game.participants.filter(p => !p.didWin)
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              {/* Game header */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="font-medium text-white">{formatDate(game.date)}</span>
                  <span className="text-slate-600">·</span>
                  <span>{game.isInPerson ? '🏠 In Person' : '💻 Remote'}</span>
                  {game.durationSeconds && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span>⏱ {formatDuration(game.durationSeconds)}</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-slate-600 shrink-0">
                  {game.participants.length} players
                </span>
              </div>

              {/* Participants */}
              <div className="space-y-2">
                {/* Winner first */}
                {winner && (
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold text-xs w-10 shrink-0">WIN</span>
                    <Link href={`/players/${encodeURIComponent(winner.playerName)}`} className="text-white font-semibold hover:text-violet-400 text-sm">
                      {winner.playerName}
                    </Link>
                    <ColorDots colors={winner.resolvedColorIdentity} />
                    <Link href={`/commanders/${encodeURIComponent(winner.commanderName)}`} className="text-slate-400 text-xs hover:text-slate-200 truncate">
                      {commanderLabel(winner)}
                    </Link>
                  </div>
                )}
                {/* Losers */}
                {losers.map(part => (
                  <div key={part.playerName} className="flex items-center gap-3">
                    <span className="text-slate-600 text-xs w-10 shrink-0">—</span>
                    <Link href={`/players/${encodeURIComponent(part.playerName)}`} className="text-slate-300 hover:text-violet-400 text-sm">
                      {part.playerName}
                    </Link>
                    <ColorDots colors={part.resolvedColorIdentity} />
                    <Link href={`/commanders/${encodeURIComponent(part.commanderName)}`} className="text-slate-500 text-xs hover:text-slate-300 truncate">
                      {commanderLabel(part)}
                    </Link>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {game.notes.trim() && (
                <div className="mt-3 text-slate-500 text-xs leading-relaxed border-t border-slate-800 pt-3">
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
