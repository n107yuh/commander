import { ImageResponse } from 'next/og'
import { loadData } from '@/lib/data'

export const runtime = 'nodejs'
export const alt = 'Commander Tracker'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  const { games } = loadData()
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date))

  // Mirrors digichampion/irlchampion/ultimateChampion in the Mac app's
  // GamesView.swift, and website/src/app/page.tsx's dashboard banner.
  const digiChampion = sorted.find(g => !g.isInPerson && g.participants.some(p => p.didWin))
    ?.participants.find(p => p.didWin)?.playerName ?? null
  const irlChampion = sorted.find(g => g.isInPerson && g.participants.some(p => p.didWin))
    ?.participants.find(p => p.didWin)?.playerName ?? null
  const ultimateChampion = digiChampion && digiChampion === irlChampion ? digiChampion : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020617',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <span style={{ fontSize: 44 }}>⚔️</span>
          <span style={{ fontSize: 44, fontWeight: 700, color: '#a78bfa', letterSpacing: -1 }}>
            Commander Tracker
          </span>
        </div>

        {ultimateChampion ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 96 }}>🌈</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 4 }}>
              Ultimate Champion
            </span>
            <span style={{ fontSize: 52, fontWeight: 700, color: '#ffffff' }}>{ultimateChampion}</span>
          </div>
        ) : digiChampion || irlChampion ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 96 }}>
            {digiChampion && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 72 }}>👑</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 3 }}>
                  Digichampion
                </span>
                <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff' }}>{digiChampion}</span>
              </div>
            )}
            {irlChampion && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 72 }}>👑</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 3 }}>
                  IRLchampion
                </span>
                <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff' }}>{irlChampion}</span>
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 30, color: '#94a3b8' }}>MTG Commander pod game tracker</span>
        )}
      </div>
    ),
    { ...size }
  )
}
