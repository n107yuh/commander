import { placementLabel } from '@/lib/format'
import type { PlacementStats } from '@/lib/data'

// Gold/silver/bronze match the Mac app's podium colors exactly (Stats.swift's
// PlayerDetailView.placementsBlock); 4th/5th extend the medal metaphor down to
// duller, cooler tones since there's no real-world precedent past bronze.
const PLACEMENT_COLOR = ['#DBB21C', '#B8BAC7', '#CC7D33', '#64748B', '#57534E']

export function PlacementChart({ stats }: { stats: PlacementStats }) {
  const placements = Array.from({ length: Math.max(stats.maxPlacement + 1, 3) }, (_, i) => i)
  const maxCount = Math.max(1, ...placements.map(p => stats.counts[p] ?? 0))

  return (
    <div className="flex items-end gap-5">
      <div className="flex items-end gap-3">
        {placements.map(p => {
          const count = stats.counts[p] ?? 0
          const height = count > 0 ? Math.max(10, 64 * (count / maxCount)) : 10
          return (
            <div key={p} className="flex flex-col items-center gap-1.5 w-11">
              <span className={`text-xs font-mono font-semibold ${count > 0 ? 'text-white' : 'text-slate-600'}`}>
                {count > 0 ? count : '—'}
              </span>
              <div
                className={`w-11 rounded ${count > 0 ? '' : 'bg-slate-800'}`}
                style={{ height, backgroundColor: count > 0 ? PLACEMENT_COLOR[p] ?? '#3f3f46' : undefined }}
              />
              <span className="text-xs text-slate-500 font-medium">{placementLabel(p)}</span>
            </div>
          )
        })}
      </div>
      {stats.averagePlacement !== null && (
        <div className="flex flex-col items-center gap-1.5 pl-2 border-l border-slate-800">
          <span className="text-xs font-mono font-semibold text-slate-300">
            {stats.averagePlacement.toFixed(1)}
          </span>
          <div className="w-11" style={{ height: 10 }} />
          <span className="text-xs text-slate-500 font-medium">Avg</span>
        </div>
      )}
    </div>
  )
}
