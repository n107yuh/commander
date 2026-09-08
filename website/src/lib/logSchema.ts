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

// Real commander-legal cards not yet indexed by Scryfall at all — mirrors
// extraKnownCommanderNames in the Mac app's Models.swift. Deliberately NOT
// "every card", just specific ones the pod actually plays; see
// searchCommanders/isValidCommander in scryfall.ts, which merge this in with
// Scryfall's live results. Empty for now — see COMMANDER_NAME_ALIASES below
// for the "printed name differs from the real card" case, which covers every
// crossover name seen so far.
export const EXTRA_KNOWN_COMMANDER_NAMES: string[] = []

// Printed/flavor names that differ from a card's real (Oracle) name — mirrors
// commanderNameAliases in the Mac app's Models.swift. E.g. the Street Fighter
// treatment "Dhalsim, Pliable Pacifist" is really "Tadeas, Juniper Ascendant"
// under the hood (same G/W card, alternate name/art/flavor text on this
// printing) — Scryfall only indexes the real name. Looked up
// case-insensitively; see resolveAlias in scryfall.ts.
export const COMMANDER_NAME_ALIASES: Record<string, string> = {
  'Dhalsim, Pliable Pacifist': 'Tadeas, Juniper Ascendant',
}

// A commander needs a manual color-identity pick either because it's one of
// the handful of printed cards whose identity genuinely varies per game
// (VARIABLE_IDENTITY_COMMANDER_NAMES), or because Scryfall couldn't confirm
// it at all (unverifiedNames, populated by CommanderCombobox — covers a
// brand-new Universes Beyond commander Scryfall hasn't indexed yet, or a
// homebrew/proxy card) — see the same generalization in the Mac app's
// GamesView.swift/needsColorChoice.
export function needsColorIdentityChoice(commanderName: string, unverifiedNames?: Set<string>): boolean {
  const lower = commanderName.trim().toLowerCase()
  if (!lower) return false
  return VARIABLE_IDENTITY_COMMANDER_NAMES.has(lower) || (unverifiedNames?.has(lower) ?? false)
}

export interface PendingParticipant {
  playerName: string
  commanderName: string
  partnerCommanderName: string | null
  // 0-indexed starting turn order; -1 means not recorded.
  turnOrder: number
  // Cards in the opening hand after mulligans; 7 = no mulligan.
  openingHandSize: number
  // Only meaningful when needsColorIdentityChoice is true for the commander
  // or partner (the fixed variable-identity list, or Scryfall couldn't
  // confirm the name this session).
  chosenColorIdentity: string[]
  // Turns this player was in the game for — stops increasing once they're
  // eliminated, unlike a single game-wide turn count. 0 means not recorded.
  turnsPlayed: number
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
    turnsPlayed: 0,
  }
}

export function newEmptyGame(): PendingGame {
  const now = new Date()
  return {
    date: formatIsoNoMillis(now),
    // Left unset rather than auto-filled to +90min — the user must enter a real end time
    // (see the "Set end time" split date/time UI and validation in GameLogForm.tsx).
    endTime: null,
    isInPerson: true,
    notes: '',
    participants: [newEmptyParticipant(), newEmptyParticipant(), newEmptyParticipant(), newEmptyParticipant()],
  }
}
