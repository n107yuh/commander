import Link from 'next/link'
import Image from 'next/image'
import { loadData, formatWinRate } from '@/lib/data'
import { ColorDots } from '@/components/ColorDots'

export default function CommandersPage() {
  const { commanders } = loadData()
  const sorted = [...commanders].sort((a, b) => b.totalGames - a.totalGames || b.winRate - a.winRate)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Commander Records</h1>

      {sorted.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-10 text-center text-slate-500">
          No commanders yet. Export data from the app.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(cmd => (
          <Link
            key={cmd.name}
            href={`/commanders/${encodeURIComponent(cmd.name)}`}
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 hover:bg-slate-800/50 transition-colors flex gap-3"
          >
            {/* Card thumbnail */}
            {cmd.imageURLs && cmd.imageURLs[0] ? (
              <div className="shrink-0 w-12 h-[66px] rounded overflow-hidden bg-slate-800">
                <img src={cmd.imageURLs[0]} alt={cmd.name} className="w-full h-full object-cover object-top" />
              </div>
            ) : (
              <div className="shrink-0 w-12 h-[66px] rounded bg-slate-800 flex items-center justify-center text-slate-600 text-xl">⚔️</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white text-sm leading-tight line-clamp-2">{cmd.name}</div>
              <div className="mt-1.5"><ColorDots colors={cmd.colorIdentity} /></div>
              <div className="flex gap-2 mt-1.5 text-xs font-mono">
                <span className="text-emerald-400">{cmd.wins}W</span>
                <span className="text-red-400">{cmd.losses}L</span>
                <span className="text-slate-400">{formatWinRate(cmd.winRate)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
