// Client-side Scryfall lookups for the /log commander fields — lets the lite
// logger suggest and flag commander-legal cards, without needing any
// server-side proxy (Scryfall's API is CORS-enabled for browser use).
// Advisory only: Scryfall not recognizing a name (a brand-new Universes
// Beyond commander it hasn't indexed yet, or a homebrew/proxy) doesn't block
// logging the game — see CommanderCombobox's 'unverifiable' status.

import { EXTRA_KNOWN_COMMANDER_NAMES, COMMANDER_NAME_ALIASES } from './logSchema'

const HEADERS = { Accept: 'application/json' }

interface ScryfallSearchResponse {
  data?: { name: string }[]
}

// The real Oracle name to actually query Scryfall with, if `name` is a known printed/flavor alias
// (COMMANDER_NAME_ALIASES) — otherwise `name` unchanged.
function resolveAlias(name: string): string {
  const lower = name.toLowerCase()
  const key = Object.keys(COMMANDER_NAME_ALIASES).find(k => k.toLowerCase() === lower)
  return key ? COMMANDER_NAME_ALIASES[key] : name
}

// Suggestions for the dropdown as the user types — restricted to
// commander-legal cards (is:commander covers legendary creatures plus the
// handful of other card types that can lead a deck) whose name contains the
// query. Hand-maintained names Scryfall doesn't know about at all
// (EXTRA_KNOWN_COMMANDER_NAMES) or only under a different real name
// (COMMANDER_NAME_ALIASES) come first, so a real card the pod plays isn't
// crowded out of the visible list by Scryfall's 20-result cap.
export async function searchCommanders(query: string, signal?: AbortSignal): Promise<string[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const extraNames = [...EXTRA_KNOWN_COMMANDER_NAMES, ...Object.keys(COMMANDER_NAME_ALIASES)]
  const extraMatches = extraNames.filter(n => n.toLowerCase().includes(trimmed.toLowerCase()))

  const q = `is:commander name:"${trimmed}"`
  const url = `https://api.scryfall.com/cards/search?${new URLSearchParams({ q, unique: 'cards', order: 'name' })}`
  try {
    const res = await fetch(url, { headers: HEADERS, signal })
    if (!res.ok) return extraMatches // includes 404, which Scryfall returns for "no matches"
    const json: ScryfallSearchResponse = await res.json()
    const names = [...extraMatches, ...(json.data ?? []).map(c => c.name)]
    return Array.from(new Set(names)).slice(0, 20)
  } catch {
    return extraMatches
  }
}

// Exact-name check used to confirm (or reject) whatever's actually in the
// field once the user moves on, whether they picked a suggestion or typed
// a full name themselves.
export async function isValidCommander(name: string, signal?: AbortSignal): Promise<boolean> {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (EXTRA_KNOWN_COMMANDER_NAMES.some(n => n.toLowerCase() === trimmed.toLowerCase())) return true
  const escaped = resolveAlias(trimmed).replace(/"/g, '\\"')
  const q = `is:commander !"${escaped}"`
  const url = `https://api.scryfall.com/cards/search?${new URLSearchParams({ q })}`
  try {
    const res = await fetch(url, { headers: HEADERS, signal })
    if (!res.ok) return false
    const json: ScryfallSearchResponse = await res.json()
    return (json.data?.length ?? 0) > 0
  } catch {
    return false
  }
}
