// Sort options shared by every commander list on the site (a player's commander records and the
// full Commander Records / 1v1 pages), so they always offer the same choices in the same order.

export type CommanderSortKey = 'winRateDesc' | 'winRateAsc' | 'az' | 'za' | 'gamesDesc' | 'winsDesc' | 'recent'

export const COMMANDER_SORT_OPTIONS: { value: CommanderSortKey; label: string }[] = [
  { value: 'winRateDesc', label: 'Win % (high to low)' },
  { value: 'winRateAsc', label: 'Win % (low to high)' },
  { value: 'az', label: 'Alphabetical (A–Z)' },
  { value: 'za', label: 'Alphabetical (Z–A)' },
  { value: 'gamesDesc', label: 'Most games played' },
  { value: 'winsDesc', label: 'Most wins' },
  { value: 'recent', label: 'Most recently played' },
]

export interface CommanderSortable {
  name: string
  wins: number
  games: number
  // ISO date of the most recent game the commander (or commander combo) was used in.
  lastPlayed: string
}

function winRate(e: CommanderSortable): number {
  return e.games > 0 ? e.wins / e.games : 0
}

// Every sort falls back to the default order (win %, then games, then name) so ties are stable.
function byDefault(a: CommanderSortable, b: CommanderSortable): number {
  return winRate(b) - winRate(a) || b.games - a.games || a.name.localeCompare(b.name)
}

const COMPARATORS: Record<CommanderSortKey, (a: CommanderSortable, b: CommanderSortable) => number> = {
  winRateDesc: byDefault,
  winRateAsc: (a, b) => winRate(a) - winRate(b) || b.games - a.games || a.name.localeCompare(b.name),
  az: (a, b) => a.name.localeCompare(b.name),
  za: (a, b) => b.name.localeCompare(a.name),
  gamesDesc: (a, b) => b.games - a.games || byDefault(a, b),
  winsDesc: (a, b) => b.wins - a.wins || byDefault(a, b),
  recent: (a, b) => b.lastPlayed.localeCompare(a.lastPlayed) || byDefault(a, b),
}

// `toSortable` adapts a list's own entry shape (e.g. `label` instead of `name`).
export function commanderComparator<T>(
  key: CommanderSortKey,
  toSortable: (entry: T) => CommanderSortable,
): (a: T, b: T) => number {
  const compare = COMPARATORS[key]
  return (a, b) => compare(toSortable(a), toSortable(b))
}
