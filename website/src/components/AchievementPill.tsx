import type { AchievementData } from '@/lib/types'

export const ICON: Record<string, string> = {
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
  'nat20-win': '🎲',
  'nat20-loss': '🎲',
  'nat1-win': '🎲',
  'nat1-loss': '🎲',
  'commanderdamagekill': '⚔️',
  'commanderdamagedeath': '🛡️',
  'solring1-win': '💍',
  'solring1-loss': '💍',
}

// The Mac app's export inconsistently titles some achievements depending on
// whether they came from the aggregate catalog or a per-game trigger (e.g.
// "52pickup" is "Oops, Butterfingers" in one place and "52 Pickup" in the
// other). Force the canonical title here so the website is always consistent
// regardless of which title string is in the underlying data.
const TITLE_OVERRIDE: Record<string, string> = {
  '52pickup': 'Oops, Butterfingers',
  'commanderdamagekill': 'Commander Keen',
}

export function AchievementPill({ a, count }: { a: AchievementData; count?: number }) {
  const icon = ICON[a.id] ?? '🏆'
  const title = TITLE_OVERRIDE[a.id] ?? a.title
  return (
    <span className="relative group/pill inline-block">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap">
        <span>{icon}</span>
        <span>{title}{count && count >= 2 ? ` ×${count}` : ''}</span>
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/pill:block w-56 z-20 rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs leading-snug text-slate-200 shadow-lg whitespace-normal">
        <span className="font-semibold text-white">{title}</span> — {a.description}
      </span>
    </span>
  )
}
