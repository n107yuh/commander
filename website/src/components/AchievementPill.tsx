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

export function AchievementPill({ a }: { a: AchievementData }) {
  const icon = ICON[a.id] ?? '🏆'
  return (
    <span
      title={`${a.title} — ${a.description}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap"
    >
      <span>{icon}</span>
      <span>{a.title}</span>
    </span>
  )
}
