import { cache } from 'react'
import fs from 'fs'
import path from 'path'
import type { ExportData, GameData, PlayerData } from './types'

export { formatWinRate, formatDate, formatTime, formatDuration, commanderLabel } from './format'

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

// Tally how many times each achievement id was triggered across a set of games.
// Milestone achievements (e.g. "5 Wins") never appear in triggeredAchievements,
// so this naturally only produces counts for the repeatable per-game ones
// (First Blood, Pacifist, the player-specific ones, etc.) — same set the Mac
// app tracks with an "Earned N times" progress string.
function tallyAchievements(games: GameData[], part: (g: GameData) => { triggeredAchievements: { id: string }[] } | undefined): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const game of games) {
    const p = part(game)
    if (!p) continue
    for (const a of p.triggeredAchievements) {
      counts[a.id] = (counts[a.id] ?? 0) + 1
    }
  }
  return counts
}

export function playerAchievementCounts(games: GameData[], playerName: string): Record<string, number> {
  return tallyAchievements(
    getPlayerGames(games, playerName),
    g => g.participants.find(p => p.playerName === playerName)
  )
}

export function commanderAchievementCounts(games: GameData[], commanderName: string): Record<string, number> {
  return tallyAchievements(
    getCommanderGames(games, commanderName),
    g => g.participants.find(p => p.commanderName === commanderName || p.partnerCommanderName === commanderName)
  )
}

const WUBRG = ['W', 'U', 'B', 'R', 'G']

export const MONO_COMBOS = ['W', 'U', 'B', 'R', 'G', 'C']
export const DUAL_COMBOS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG']
export const TRI_COMBOS = ['WUB', 'WUR', 'WUG', 'WBR', 'WBG', 'WRG', 'UBR', 'UBG', 'URG', 'BRG']

export interface ColorMasteryProgress {
  mono: Set<string>
  dual: Set<string>
  tri: Set<string>
}

// Mirrors wonColorCombinations(in:) in the Mac app's Achievements.swift: for each
// win, classify the resolved color identity by size into mono/dual/tri combo keys
// (WUBRG-ordered). Games with unresolved color identity (no Scryfall data at all)
// are skipped, same as the Mac app.
export function colorMasteryProgress(games: GameData[], playerName: string): ColorMasteryProgress {
  const mono = new Set<string>()
  const dual = new Set<string>()
  const tri = new Set<string>()

  for (const game of getPlayerGames(games, playerName)) {
    const part = game.participants.find(p => p.playerName === playerName)
    if (!part || !part.didWin || !part.resolvedColorIdentity) continue
    const colors = part.resolvedColorIdentity.filter(c => WUBRG.includes(c))
    const key = WUBRG.filter(c => colors.includes(c)).join('')
    switch (colors.length) {
      case 0: mono.add('C'); break
      case 1: mono.add(key); break
      case 2: dual.add(key); break
      case 3: tri.add(key); break
      default: break
    }
  }

  return { mono, dual, tri }
}

export function playerStandings(players: PlayerData[]): PlayerData[] {
  return [...players].sort((a, b) => {
    if (b.totalGames === 0 && a.totalGames === 0) return 0
    if (b.totalGames === 0) return -1
    if (a.totalGames === 0) return 1
    return b.winRate - a.winRate || b.wins - a.wins
  })
}
