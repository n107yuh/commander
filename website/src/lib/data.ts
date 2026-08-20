import { cache } from 'react'
import fs from 'fs'
import path from 'path'
import type { ExportData, GameData, PlayerData } from './types'
import { commanderLabel } from './format'

export { formatWinRate, formatDate, formatTime, formatDuration, commanderLabel, placementLabel } from './format'

export const loadData = cache((): ExportData => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'export.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as ExportData
  } catch {
    return { exportedAt: '', players: [], commanders: [], games: [] }
  }
})

export function getPlayerGames(games: GameData[], playerName: string): GameData[] {
  return games.filter(g => g.participants.some(p => p.playerName === playerName))
}

export function getCommanderGames(games: GameData[], commanderName: string): GameData[] {
  return games.filter(g =>
    g.participants.some(p =>
      p.commanderName === commanderName || p.partnerCommanderName === commanderName
    )
  )
}

// Mirrors currentStreak(in:winning:) in the Mac app's Achievements.swift: sort by
// date descending (most recent first) and count consecutive matches from the start.
function currentStreak(games: GameData[], playerName: string, winning: boolean): number {
  const sorted = getPlayerGames(games, playerName).sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (const game of sorted) {
    const part = game.participants.find(p => p.playerName === playerName)
    if (!part) continue
    if (part.didWin !== winning) break
    streak++
  }
  return streak
}

export function currentWinStreak(games: GameData[], playerName: string): number {
  return currentStreak(games, playerName, true)
}

export function currentLossStreak(games: GameData[], playerName: string): number {
  return currentStreak(games, playerName, false)
}

const WUBRG = ['W', 'U', 'B', 'R', 'G']

export const MONO_COMBOS = ['W', 'U', 'B', 'R', 'G', 'C']
export const DUAL_COMBOS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG']
export const TRI_COMBOS = ['WUB', 'WUR', 'WUG', 'WBR', 'WBG', 'WRG', 'UBR', 'UBG', 'URG', 'BRG']

export interface ColorMasteryProgress {
  mono: Set<string>
  dual: Set<string>
  tri: Set<string>
  fiveColor: boolean
  // combo key -> every distinct commander (or partner pairing) that has won with
  // that color identity, comma-separated in order of first win. Extends the Mac
  // app's firstWinningCommanderByComboKey(in:) (Achievements.swift), which only
  // records the single first winner per combo — the website shows all of them.
  comboCommander: Record<string, string>
}

// Mirrors wonColorCombinations(in:) in the Mac app's Achievements.swift: for each
// win, classify the resolved color identity by size into mono/dual/tri combo keys
// (WUBRG-ordered). Games with unresolved color identity (no Scryfall data at all)
// are skipped, same as the Mac app.
export function colorMasteryProgress(games: GameData[], playerName: string): ColorMasteryProgress {
  const mono = new Set<string>()
  const dual = new Set<string>()
  const tri = new Set<string>()
  let fiveColor = false
  const comboCommanders: Record<string, string[]> = {}

  // Oldest first, so commanders are listed in the order they first won the combo.
  const sortedAsc = getPlayerGames(games, playerName).sort((a, b) => a.date.localeCompare(b.date))

  for (const game of sortedAsc) {
    const part = game.participants.find(p => p.playerName === playerName)
    if (!part || !part.didWin || !part.resolvedColorIdentity) continue
    const colors = part.resolvedColorIdentity.filter(c => WUBRG.includes(c))
    const key = WUBRG.filter(c => colors.includes(c)).join('')
    let bucketKey: string | null = null
    switch (colors.length) {
      case 0: mono.add('C'); bucketKey = 'C'; break
      case 1: mono.add(key); bucketKey = key; break
      case 2: dual.add(key); bucketKey = key; break
      case 3: tri.add(key); bucketKey = key; break
      case 5: fiveColor = true; bucketKey = key; break
      default: break
    }
    if (bucketKey) {
      const label = commanderLabel(part)
      const list = comboCommanders[bucketKey] ?? (comboCommanders[bucketKey] = [])
      if (!list.includes(label)) list.push(label)
    }
  }

  const comboCommander: Record<string, string> = {}
  for (const [key, labels] of Object.entries(comboCommanders)) {
    comboCommander[key] = labels.join(', ')
  }

  return { mono, dual, tri, fiveColor, comboCommander }
}

export interface HeadToHeadEntry {
  opponent: string
  gamesTogether: number
  myWins: number
  theirWins: number
}

// For every other player who has shared a pod with playerName, tally games
// played together and how many of those each side won. In free-for-all
// Commander a third player can win a game both were in, so myWins + theirWins
// don't necessarily sum to gamesTogether.
export function headToHead(games: GameData[], playerName: string): HeadToHeadEntry[] {
  const stats: Record<string, HeadToHeadEntry> = {}
  for (const game of games) {
    const me = game.participants.find(p => p.playerName === playerName)
    if (!me) continue
    for (const opp of game.participants) {
      if (opp.playerName === playerName) continue
      if (!stats[opp.playerName]) {
        stats[opp.playerName] = { opponent: opp.playerName, gamesTogether: 0, myWins: 0, theirWins: 0 }
      }
      stats[opp.playerName].gamesTogether++
      if (me.didWin) stats[opp.playerName].myWins++
      if (opp.didWin) stats[opp.playerName].theirWins++
    }
  }
  const winRate = (h: HeadToHeadEntry) => h.gamesTogether > 0 ? h.myWins / h.gamesTogether : 0
  return Object.values(stats).sort((a, b) =>
    winRate(b) - winRate(a) || b.gamesTogether - a.gamesTogether || a.opponent.localeCompare(b.opponent)
  )
}

export interface PlacementStats {
  // 0-indexed placement (0 = 1st) -> number of times finished there.
  counts: Record<number, number>
  maxPlacement: number
  averagePlacement: number | null
}

// Mirrors Stats_placementCounts/Stats_averagePlacement in the Mac app's Stats.swift.
// Placement 0 doubles as both "1st place" and "not recorded" (the SwiftData default),
// so a game only counts if some participant in it has placement > 0 — that's the only
// way to tell a game where placements were actually tracked from one where they weren't.
export function playerPlacementStats(games: GameData[], playerName: string): PlacementStats {
  const withPlacementData = games.filter(g => g.participants.some(p => p.placement > 0))
  const mine = withPlacementData
    .map(g => g.participants.find(p => p.playerName === playerName))
    .filter((p): p is GameData['participants'][number] => !!p)

  const counts: Record<number, number> = {}
  for (const p of mine) {
    counts[p.placement] = (counts[p.placement] ?? 0) + 1
  }
  const maxPlacement = mine.length ? Math.max(...mine.map(p => p.placement)) : 0
  const averagePlacement = mine.length
    ? mine.reduce((sum, p) => sum + p.placement + 1, 0) / mine.length
    : null

  return { counts, maxPlacement, averagePlacement }
}

export function playerStandings(players: PlayerData[]): PlayerData[] {
  return [...players].sort((a, b) => {
    if (b.totalGames === 0 && a.totalGames === 0) return 0
    if (b.totalGames === 0) return -1
    if (a.totalGames === 0) return 1
    return b.winRate - a.winRate || b.wins - a.wins
  })
}
