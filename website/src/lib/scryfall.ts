// Client-side Scryfall lookups for the /log commander fields — lets the lite
// logger suggest and flag commander-legal cards, without needing any
// server-side proxy (Scryfall's API is CORS-enabled for browser use).
// Advisory only: Scryfall not recognizing a name (a brand-new Universes
// Beyond commander it hasn't indexed yet, or a homebrew/proxy) doesn't block
// logging the game — see CommanderCombobox's 'unverifiable' status.

import { EXTRA_KNOWN_COMMANDER_NAMES } from './logSchema'

const HEADERS = { Accept: 'application/json' }

interface ScryfallSearchResponse {
  data?: { name: string }[]
}

interface ScryfallNamedResponse {
  name?: string
}

// Suggestions for the dropdown as the user types — restricted to
// commander-legal cards (is:commander covers legendary creatures plus the
// handful of other card types that can lead a deck) whose name contains the
// query. Hand-maintained names Scryfall's live search wouldn't otherwise
// surface (EXTRA_KNOWN_COMMANDER_NAMES) come first, so a real card the pod
// plays isn't crowded out of the visible list by Scryfall's 20-result cap.
export async function searchCommanders(query: string, signal?: AbortSignal): Promise<string[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const extraMatches = EXTRA_KNOWN_COMMANDER_NAMES.filter(n => n.toLowerCase().includes(trimmed.toLowerCase()))

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

// Confirms (or rejects) whatever's actually in the field once the user moves
// on, whether they picked a suggestion or typed a full name themselves.
// First resolves the name via Scryfall's *fuzzy* named-card lookup rather
// than an exact match — fuzzy already searches a card's printed/flavor name
// (the text actually on a Universes Beyond/Secret Lair crossover treatment)
// as well as its real Oracle name, e.g. "Dhalsim, Pliable Pacifist" and
// "Lightning, Lone Commando" both resolve with no per-card mapping needed —
// then checks that the resolved card is actually commander-legal (fuzzy
// alone would happily resolve any real card, not just ones that can lead a
// deck).
export async function isValidCommander(name: string, signal?: AbortSignal): Promise<boolean> {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (EXTRA_KNOWN_COMMANDER_NAMES.some(n => n.toLowerCase() === trimmed.toLowerCase())) return true

  const namedUrl = `https://api.scryfall.com/cards/named?${new URLSearchParams({ fuzzy: trimmed })}`
  try {
    const namedRes = await fetch(namedUrl, { headers: HEADERS, signal })
    if (!namedRes.ok) return false // no card found under any name, real or printed/flavor
    const card: ScryfallNamedResponse = await namedRes.json()
    if (!card.name) return false

    const escaped = card.name.replace(/"/g, '\\"')
    const q = `is:commander !"${escaped}"`
    const url = `https://api.scryfall.com/cards/search?${new URLSearchParams({ q })}`
    const res = await fetch(url, { headers: HEADERS, signal })
    if (!res.ok) return false
    const json: ScryfallSearchResponse = await res.json()
    return (json.data?.length ?? 0) > 0
  } catch {
    return false
  }
}
