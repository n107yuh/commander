// Client-side Scryfall lookups for the /log commander fields — lets the lite
// logger suggest (and require) real commander-legal cards instead of
// free-text names, without needing any server-side proxy (Scryfall's API is
// CORS-enabled for browser use).

const HEADERS = { Accept: 'application/json' }

interface ScryfallSearchResponse {
  data?: { name: string }[]
}

// Suggestions for the dropdown as the user types — restricted to
// commander-legal cards (is:commander covers legendary creatures plus the
// handful of other card types that can lead a deck) whose name contains the
// query.
export async function searchCommanders(query: string, signal?: AbortSignal): Promise<string[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const q = `is:commander name:"${trimmed}"`
  const url = `https://api.scryfall.com/cards/search?${new URLSearchParams({ q, unique: 'cards', order: 'name' })}`
  try {
    const res = await fetch(url, { headers: HEADERS, signal })
    if (!res.ok) return [] // includes 404, which Scryfall returns for "no matches"
    const json: ScryfallSearchResponse = await res.json()
    const names = (json.data ?? []).map(c => c.name)
    return Array.from(new Set(names)).slice(0, 20)
  } catch {
    return []
  }
}

// Exact-name check used to confirm (or reject) whatever's actually in the
// field once the user moves on, whether they picked a suggestion or typed
// a full name themselves.
export async function isValidCommander(name: string, signal?: AbortSignal): Promise<boolean> {
  const trimmed = name.trim()
  if (!trimmed) return false
  const escaped = trimmed.replace(/"/g, '\\"')
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
