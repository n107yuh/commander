// Schema for the "lite logger" export file (see /log). Mirrors the Mac app's
// Game/GameParticipant SwiftData models field-for-field, and its
// GameEditorView.save() convention of deriving didWin/placement from array
// order (participants sorted winner-first) rather than storing them
// explicitly — so GameImportService.swift can import this with the exact
// same resolution logic the native editor uses. Keep in sync by hand with
// GameImportService.swift's Codable structs if this shape ever changes.

// Commanders whose color identity is chosen per game rather than fixed by
// the printed card — mirrors variableIdentityCommanderNames in Models.swift.
export const VARIABLE_IDENTITY_COMMANDER_NAMES = new Set([
  'the prismatic piper',
  'faceless one',
  'clara oswald',
])

export function needsColorIdentityChoice(commanderName: string): boolean {
  return VARIABLE_IDENTITY_COMMANDER_NAMES.has(commanderName.trim().toLowerCase())
}

export interface PendingParticipant {
  playerName: string
  commanderName: string
  partnerCommanderName: string | null
  // 0-indexed starting turn order; -1 means not recorded.
  turnOrder: number
  // Cards in the opening hand after mulligans; 7 = no mulligan.
  openingHandSize: number
  // Only meaningful (and only sent) when the commander or partner is in
  // VARIABLE_IDENTITY_COMMANDER_NAMES.
  chosenColorIdentity: string[]
}

export interface PendingGame {
  // ISO 8601, no fractional seconds (see formatIsoNoMillis).
  date: string
  endTime: string | null
  isInPerson: boolean
  notes: string
  // Ordered winner-first, then finishing order — didWin/placement are
  // derived from this order on import, same as the native game editor.
  participants: PendingParticipant[]
}

export interface PendingGamesFile {
  formatVersion: 1
  submittedAt: string
  games: PendingGame[]
}

// Swift's ISO8601DateFormatter (as configured in WebExportService) doesn't
// include fractional seconds, while Date#toISOString() always does — strip
// them so the Mac app's importer can use the same simple parser everywhere.
export function formatIsoNoMillis(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function newEmptyParticipant(): PendingParticipant {
  return {
    playerName: '',
    commanderName: '',
    partnerCommanderName: null,
    turnOrder: -1,
    openingHandSize: 7,
    chosenColorIdentity: [],
  }
}

export function newEmptyGame(): PendingGame {
  const now = new Date()
  const end = new Date(now.getTime() + 90 * 60 * 1000)
  return {
    date: formatIsoNoMillis(now),
    endTime: formatIsoNoMillis(end),
    isInPerson: true,
    notes: '',
    participants: [newEmptyParticipant(), newEmptyParticipant(), newEmptyParticipant(), newEmptyParticipant()],
  }
}
