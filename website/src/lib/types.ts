export interface ExportData {
  exportedAt: string
  players: PlayerData[]
  commanders: CommanderData[]
  games: GameData[]
}

export interface PlayerData {
  name: string
  wins: number
  losses: number
  totalGames: number
  winRate: number
  achievements: AchievementData[]
}

export interface CommanderData {
  name: string
  colorIdentity: string[] | null
  imageURLs: string[] | null
  wins: number
  losses: number
  totalGames: number
  winRate: number
}

export interface GameData {
  date: string
  isInPerson: boolean
  notes: string
  durationSeconds: number | null
  participants: ParticipantData[]
}

export interface ParticipantData {
  playerName: string
  commanderName: string
  partnerCommanderName: string | null
  resolvedColorIdentity: string[] | null
  didWin: boolean
  placement: number
  turnOrder: number
  openingHandSize: number
  triggeredAchievements: AchievementData[]
}

export interface AchievementData {
  id: string
  title: string
  description: string
}
