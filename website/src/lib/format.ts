// Pure formatting helpers with no server-only dependencies (no `fs`), so they're
// safe to import from client components. `data.ts` re-exports these for existing
// server-component imports; client components should import from here directly
// to avoid pulling `loadData`'s `fs`/`path` usage into the browser bundle.

export function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

// Game timestamps are exported as UTC ISO strings; without an explicit timezone
// here, formatting falls back to the server's local time (UTC on Vercel), which
// can shift a late-night game onto the next calendar day. Render in the pod's
// timezone so dates/times match what the Mac app shows.
const POD_TIMEZONE = 'America/New_York'

export function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: POD_TIMEZONE,
  })
}

export function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: POD_TIMEZONE,
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
