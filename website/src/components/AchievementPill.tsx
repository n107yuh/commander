import type { AchievementData } from '@/lib/types'

const ICON: Record<string, string> = {
  'firstblood': '🩸',
  'comefrombehind': '🐢',
  'botchedit': '💀',
  'pacifist': '☮️',
  'flyonthewall': '👁️',
  '52pickup': '🤲',
  'hattrick': '🔥',
  'nice': '😏',
  'digitalchampion': '👑',
  'irlchampion': '👑',
  'formatdiplomat': '🏅',
  'ultimatechampion': '🌈',
  'winstreak': '📈',
  'bestwinstreak': '📈',
  'lossstreak': '📉',
  'bestlossstreak': '📉',
  'quickwin': '⚡',
  'quickloss': '⚡',
  'marathonwinner': '🏃',
  'marathonsurvivor': '🚶',
  'monomaster': '🎨',
  'dualmaster': '🎨',
  'trimaster': '🎨',
  'tastetherainbow': '🌈',
  'connoisseur': '🃏',
  'loyalpilot': '🔁',
  'popularcommander': '👥',
  'jake-wizard': '🧙',
  'margolis-graveyard': '🗑️',
  'pertman-wait': '✋',
  'noah-matthew': '👎',
  'justin-rat': '🐀',
  'max-zeus': '🐱',
}

export function AchievementPill({ a, count }: { a: AchievementData; count?: number }) {
  const icon = ICON[a.id] ?? '🏆'
  return (
    <span className="relative group/pill inline-block">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap">
        <span>{icon}</span>
        <span>{a.title}{count && count >= 2 ? ` ×${count}` : ''}</span>
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/pill:block w-56 z-20 rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs leading-snug text-slate-200 shadow-lg whitespace-normal">
        <span className="font-semibold text-white">{a.title}</span> — {a.description}
      </span>
    </span>
  )
}
