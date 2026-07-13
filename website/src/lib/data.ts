import { cache } from 'react'
import fs from 'fs'
import path from 'path'
import type { ExportData, GameData, PlayerData } from './types'

export const loadData = cache((): ExportData => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'export.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as ExportData
  } catch {
    return { exportedAt: '', players: [], commanders: [], games: [] }
  }
})

export function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function commanderLabel(p: { commanderName: string; partnerCommanderName: string | null }): string {
  return p.partnerCommanderName
    ? `${p.commanderName} + ${p.partnerCommanderName}`
    : p.commanderName
}

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

export function playerStandings(players: PlayerData[]): PlayerData[] {
  return [...players].sort((a, b) => {
    if (b.totalGames === 0 && a.totalGames === 0) return 0
    if (b.totalGames === 0) return -1
    if (a.totalGames === 0) return 1
    return b.winRate - a.winRate || b.wins - a.wins
  })
}
