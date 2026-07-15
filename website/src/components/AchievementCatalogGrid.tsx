import { ICON } from './AchievementPill'
import { formatDate } from '@/lib/format'
import type { CatalogAchievement } from '@/lib/achievements'

function iconFor(id: string): string {
  if (id.startsWith('wins-')) return '🏆'
  if (id.startsWith('losses-')) return '💀'
  if (id.startsWith('games-')) return '🎖️'
  return ICON[id] ?? '🏆'
}

export function AchievementCatalogGrid({ items }: { items: CatalogAchievement[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map(a => (
        <div
          key={a.id}
          className={`relative group/cat flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
            a.isEarned ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/40 border-slate-800/60'
          }`}
        >
          <span className={`text-lg leading-none mt-0.5 shrink-0 ${a.isEarned ? '' : 'opacity-25 grayscale'}`}>{iconFor(a.id)}</span>
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${a.isEarned ? 'text-white' : 'text-slate-500'}`}>{a.title}</div>
            <div className="text-xs text-slate-500 truncate">{a.progress}</div>
            {a.isEarned && a.earnedDate && (
              <div className="text-[11px] text-slate-600 mt-0.5">{formatDate(a.earnedDate)}</div>
            )}
          </div>
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cat:block w-56 z-20 rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs leading-snug text-slate-200 shadow-lg whitespace-normal">
            <span className="font-semibold text-white">{a.title}</span> — {a.description}
          </span>
        </div>
      ))}
    </div>
  )
}
