import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadData, formatDate, formatWinRate, commanderLabel, getCommanderGames, commanderAchievementCounts } from '@/lib/data'
import { ColorDots } from '@/components/ColorDots'
import { AchievementPill } from '@/components/AchievementPill'
import { CardImageZoom } from '@/components/CardImageZoom'
import type { AchievementData } from '@/lib/types'

export default function CommanderDetail({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  const { commanders, players, games } = loadData()
  const cmd = commanders.find(c => c.name === name)
  if (!cmd) notFound()

  const cmdGames = getCommanderGames(games, name).sort((a, b) => b.date.localeCompare(a.date))

  // Pilot breakdown
  const pilotMap: Record<string, { wins: number; games: number }> = {}
  for (const game of cmdGames) {
    const part = game.participants.find(p => p.commanderName === name || p.partnerCommanderName === name)
    if (!part || !part.playerName) continue
    if (!pilotMap[part.playerName]) pilotMap[part.playerName] = { wins: 0, games: 0 }
    pilotMap[part.playerName].games++
    if (part.didWin) pilotMap[part.playerName].wins++
  }
  const pilots = Object.entries(pilotMap)
    .map(([pName, s]) => ({ name: pName, ...s, winRate: s.games > 0 ? s.wins / s.games : 0 }))
    .sort((a, b) => b.games - a.games)

  // Partner commanders
  const partnerMap: Record<string, number> = {}
  for (const game of cmdGames) {
    const part = game.participants.find(p => p.commanderName === name || p.partnerCommanderName === name)
    if (!part) continue
    const partner = part.commanderName === name ? part.partnerCommanderName : part.commanderName
    if (partner) partnerMap[partner] = (partnerMap[partner] ?? 0) + 1
  }
  const partners = Object.entries(partnerMap).sort((a, b) => b[1] - a[1])

  // Achievements earned while piloting this commander
  const achievementMap: Record<string, AchievementData> = {}
  for (const game of cmdGames) {
    const part = game.participants.find(p => p.commanderName === name || p.partnerCommanderName === name)
    if (!part) continue
    for (const a of part.triggeredAchievements) {
      achievementMap[a.id] = a
    }
  }
  const achievements = Object.values(achievementMap)
  const achievementCounts = commanderAchievementCounts(games, name)

  // Colors come from resolvedColorIdentity on participants, not the static
  // cmd.colorIdentity — some commanders (e.g. Clara Oswald) are printed
  // colorless but get a chosen color identity per game.
  const resolvedColors = new Set<string>()
  for (const game of cmdGames) {
    const part = game.participants.find(p => p.commanderName === name || p.partnerCommanderName === name)
    for (const c of part?.resolvedColorIdentity ?? []) resolvedColors.add(c)
  }
  const colorIdentity = resolvedColors.size > 0 ? Array.from(resolvedColors) : cmd.colorIdentity

  // Show this commander's own card image(s) plus the first image of each
  // partner it's been played with, so a partner pairing displays both cards.
  const images: { url: string; alt: string }[] = (cmd.imageURLs ?? []).map(url => ({ url, alt: cmd.name }))
  for (const [partnerName] of partners) {
    const partnerImage = commanders.find(c => c.name === partnerName)?.imageURLs?.[0]
    if (partnerImage) images.push({ url: partnerImage, alt: partnerName })
  }

  return (
    <div className="space-y-8">
      <Link href="/commanders" className="text-sm text-slate-400 hover:text-white">← Commanders</Link>

      <div className="flex gap-6 flex-wrap items-start">
        {/* Card images */}
        <div className="flex gap-3 items-start">
          {images.length > 0 ? images.map((img, i) => (
            <CardImageZoom key={i} src={img.url} alt={img.alt} className="w-44 h-auto rounded-xl shadow-lg" />
          )) : (
            <div className="w-44 h-[245px] rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 text-4xl">⚔️</div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{cmd.name}</h1>
            <div className="mt-2"><ColorDots colors={colorIdentity} size="md" /></div>
          </div>

          {/* Overall record */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Wins', value: cmd.wins, cls: 'text-emerald-400' },
              { label: 'Losses', value: cmd.losses, cls: 'text-red-400' },
              { label: 'Games', value: cmd.totalGames, cls: 'text-white' },
              { label: 'Win%', value: formatWinRate(cmd.winRate), cls: 'text-violet-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className={`text-xl font-bold font-mono ${s.cls}`}>{s.value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Achievements</div>
              <div className="flex flex-wrap gap-2">
                {achievements.map(a => <AchievementPill key={a.id} a={a} count={achievementCounts[a.id]} />)}
              </div>
            </div>
          )}

          {/* Partners */}
          {partners.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Partnered With</div>
              <div className="flex flex-wrap gap-2">
                {partners.map(([p, count]) => (
                  <Link
                    key={p}
                    href={`/commanders/${encodeURIComponent(p)}`}
                    className="text-sm text-slate-300 hover:text-violet-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-md"
                  >
                    {p} <span className="text-slate-500 text-xs">×{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pilots */}
          {pilots.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilots</div>
              <div className="space-y-1.5">
                {pilots.map(pilot => (
                  <div key={pilot.name} className="flex items-center gap-3 text-sm">
                    <Link href={`/players/${encodeURIComponent(pilot.name)}`} className="text-white hover:text-violet-400 w-24 truncate">
                      {pilot.name}
                    </Link>
                    <span className="text-emerald-400 font-mono">{pilot.wins}W</span>
                    <span className="text-red-400 font-mono">{pilot.games - pilot.wins}L</span>
                    <span className="text-slate-400 font-mono">{formatWinRate(pilot.winRate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game log */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Game History</h2>
        <div className="space-y-2">
          {cmdGames.map((game, i) => {
            const part = game.participants.find(p => p.commanderName === name || p.partnerCommanderName === name)
            if (!part) return null
            const others = game.participants.filter(p => p !== part)
            return (
              <div key={i} className={`bg-slate-900 border rounded-lg px-4 py-3 ${part.didWin ? 'border-emerald-900/50' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold shrink-0 ${part.didWin ? 'text-emerald-400' : 'text-red-400'}`}>
                      {part.didWin ? 'WIN' : 'LOSS'}
                    </span>
                    <Link href={`/players/${encodeURIComponent(part.playerName)}`} className="text-slate-300 text-sm hover:text-violet-400">
                      {part.playerName}
                    </Link>
                  </div>
                  <span className="text-slate-500 text-xs shrink-0">{formatDate(game.date)} · {game.isInPerson ? '🏠' : '💻'}</span>
                </div>
                {others.length > 0 && (
                  <div className="text-slate-500 text-xs mt-1">
                    vs {others.map(o => `${o.playerName} (${commanderLabel(o)})`).join(', ')}
                  </div>
                )}
                {part.triggeredAchievements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {part.triggeredAchievements.map(a => <AchievementPill key={a.id} a={a} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
