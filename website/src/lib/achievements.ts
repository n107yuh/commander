// Ports computeAchievementCatalog/achievementEarnedDates from the Mac app's
// Achievements.swift so the website can show a player's or commander's FULL
// achievement catalog (earned + unearned) with progress text and unlock
// dates, not just the compact earned-only list the export already carries.
// Everything here is derived purely from already-exported GameData — no
// export shape changes needed, since perGameTriggeredAchievements already
// bakes the keyword/note-matched achievements (Pacifist, 52 Pickup, the
// player-specific jokes, etc.) into each participant's triggeredAchievements
// for every game.
import type { GameData, ParticipantData } from './types'
import { formatDuration } from './format'

export interface CatalogAchievement {
  id: string
  title: string
  description: string
  category: string
  progress: string
  isEarned: boolean
  earnedDate: string | null
}

interface Dated {
  date: string
  game: GameData
  part: ParticipantData
}

const WUBRG = ['W', 'U', 'B', 'R', 'G']

function playerParticipations(games: GameData[], playerName: string): Dated[] {
  const result: Dated[] = []
  for (const game of games) {
    const part = game.participants.find(p => p.playerName === playerName)
    if (part) result.push({ date: game.date, game, part })
  }
  return result
}

function commanderParticipations(games: GameData[], commanderName: string): Dated[] {
  const result: Dated[] = []
  for (const game of games) {
    const part = game.participants.find(p => p.commanderName === commanderName || p.partnerCommanderName === commanderName)
    if (part) result.push({ date: game.date, game, part })
  }
  return result
}

function comboKey(part: ParticipantData): string | null {
  const names = [part.commanderName, part.partnerCommanderName].filter((n): n is string => !!n).sort()
  return names.length > 0 ? names.join('+') : null
}

function triggeredInfo(asc: Dated[], id: string): { count: number; firstDate: string | null } {
  let count = 0
  let firstDate: string | null = null
  for (const x of asc) {
    if (x.part.triggeredAchievements.some(a => a.id === id)) {
      count++
      if (!firstDate) firstDate = x.date
    }
  }
  return { count, firstDate }
}

function clean(progress: string): string {
  return progress.endsWith('.') ? progress.slice(0, -1) : progress
}

function ownDurations(asc: Dated[], winning: boolean): { date: string; duration: number }[] {
  return asc
    .filter(x => x.part.didWin === winning && x.game.durationSeconds && x.game.durationSeconds > 0)
    .map(x => ({ date: x.date, duration: x.game.durationSeconds as number }))
}

function recordAchievement(
  id: string, title: string, description: string,
  mineList: { date: string; duration: number }[], record: number | null, pick: 'min' | 'max',
  myFormat: (s: number) => string, recordFormat: (s: number) => string, bothFormat: (mine: number, rec: number) => string,
  noMyData: string, noAnyData: string,
): CatalogAchievement {
  const mine = mineList.length
    ? mineList.reduce((best, x) => (pick === 'min' ? x.duration < best.duration : x.duration > best.duration) ? x : best)
    : null
  let isEarned = false, progress: string, earnedDate: string | null = null
  if (mine && record != null) {
    if (Math.abs(mine.duration - record) < 1) { isEarned = true; progress = myFormat(mine.duration); earnedDate = mine.date }
    else { isEarned = false; progress = bothFormat(mine.duration, record) }
  } else if (!mine && record != null) {
    isEarned = false; progress = `${noMyData} ${recordFormat(record)}`
  } else if (mine && record == null) {
    isEarned = true; progress = myFormat(mine.duration); earnedDate = mine.date
  } else {
    isEarned = false; progress = noAnyData
  }
  return { id, title, description, category: 'Speed & Endurance', isEarned, progress, earnedDate }
}

// Shared engine behind both computePlayerAchievementCatalog and
// computeCommanderAchievementCatalog, mirroring computeAchievementCatalog's
// showPlayerAchievements branch in the Mac app: player-only sections
// (Pacifist/Fly On The Wall/52 Pickup/Nice/Hat Trick, Connoisseur/Loyal
// Pilot, color mastery, the named personal jokes) are swapped for the
// commander-only Popular Commander achievement.
function buildCatalog(games: GameData[], asc: Dated[], desc: Dated[], playerName: string | null): CatalogAchievement[] {
  const showPlayerOnly = playerName !== null
  const result: CatalogAchievement[] = []

  // Win/loss/games milestone tiers
  const wins = asc.filter(x => x.part.didWin)
  const losses = asc.filter(x => !x.part.didWin)
  for (const n of [5, 10, 15, 20]) {
    const earned = wins.length >= n
    result.push({
      id: `wins-${n}`, title: `${n} Wins`, description: `Win ${n} games.`, category: 'Win Milestones',
      isEarned: earned, progress: earned ? 'Unlocked' : `${wins.length} of ${n} wins`,
      earnedDate: earned ? wins[n - 1].date : null,
    })
  }
  for (const n of [5, 10, 15, 20]) {
    const earned = losses.length >= n
    result.push({
      id: `losses-${n}`, title: `${n} Losses`, description: `Lose ${n} games.`, category: 'Loss Milestones',
      isEarned: earned, progress: earned ? 'Unlocked' : `${losses.length} of ${n} losses`,
      earnedDate: earned ? losses[n - 1].date : null,
    })
  }

  // Streaks
  let curWin = 0
  for (const x of desc) { if (x.part.didWin) curWin++; else break }
  let curLoss = 0
  for (const x of desc) { if (!x.part.didWin) curLoss++; else break }
  const curWinStart = curWin > 0 ? desc[curWin - 1].date : null
  const curLossStart = curLoss > 0 ? desc[curLoss - 1].date : null

  let bestWin = 0, bestWinDate: string | null = null, runWin = 0
  let bestLoss = 0, bestLossDate: string | null = null, runLoss = 0
  let hattrickDate: string | null = null
  for (const x of asc) {
    if (x.part.didWin) {
      runWin++; runLoss = 0
      if (runWin > bestWin) { bestWin = runWin; bestWinDate = x.date }
      if (runWin >= 3 && !hattrickDate) hattrickDate = x.date
    } else {
      runLoss++; runWin = 0
      if (runLoss > bestLoss) { bestLoss = runLoss; bestLossDate = x.date }
    }
  }

  result.push({
    id: 'winstreak', title: 'Win Streak', description: 'Consecutive wins since the last loss.', category: 'Streaks',
    isEarned: curWin > 0, progress: curWin > 0 ? `${curWin} wins in a row` : 'No active win streak.', earnedDate: curWinStart,
  })
  result.push({
    id: 'bestwinstreak', title: 'Best Win Streak', description: 'The longest winning streak ever.', category: 'Streaks',
    isEarned: bestWin > 0, progress: bestWin > 0 ? `${bestWin} wins in a row (all time)` : 'No wins yet.', earnedDate: bestWinDate,
  })
  result.push({
    id: 'lossstreak', title: 'Loss Streak', description: 'Consecutive losses since the last win.', category: 'Streaks',
    isEarned: curLoss > 0, progress: curLoss > 0 ? `${curLoss} losses in a row` : 'No active loss streak.', earnedDate: curLossStart,
  })
  result.push({
    id: 'bestlossstreak', title: 'Worst Loss Streak', description: 'The longest losing streak ever.', category: 'Streaks',
    isEarned: bestLoss > 0, progress: bestLoss > 0 ? `${bestLoss} losses in a row (all time)` : 'No losses yet.', earnedDate: bestLossDate,
  })

  // Speed & endurance — pod-wide context: every game has both a winner and
  // losers, so the pod's quickest-win and quickest-loss records are both just
  // the minimum duration across all games (same for the longest/marathon record).
  const podDurations = games.map(g => g.durationSeconds).filter((d): d is number => !!d && d > 0)
  const podQuickest = podDurations.length ? Math.min(...podDurations) : null
  const podLongest = podDurations.length ? Math.max(...podDurations) : null

  result.push(recordAchievement(
    'quickwin', 'Quickest Win', "Win the pod's fastest game on record.",
    ownDurations(asc, true), podQuickest, 'min',
    s => `Won in ${formatDuration(s)}`, s => `Record: ${formatDuration(s)}`,
    (m, r) => `Best: ${formatDuration(m)} • Record: ${formatDuration(r)}`,
    'No timed wins yet.', 'No timed games yet.',
  ))
  result.push(recordAchievement(
    'quickloss', 'Quickest Loss', "Lose the pod's fastest game on record.",
    ownDurations(asc, false), podQuickest, 'min',
    s => `Lost in ${formatDuration(s)}`, s => `Record: ${formatDuration(s)}`,
    (m, r) => `Best: ${formatDuration(m)} • Record: ${formatDuration(r)}`,
    'No timed losses yet.', 'No timed games yet.',
  ))
  result.push(recordAchievement(
    'marathonwinner', 'Marathon Winner', "Win the pod's longest game on record.",
    ownDurations(asc, true), podLongest, 'max',
    s => `Won a ${formatDuration(s)} game`, s => `Record: ${formatDuration(s)}`,
    (m, r) => `Longest win: ${formatDuration(m)} • Record: ${formatDuration(r)}`,
    'No timed wins yet.', 'No timed games yet.',
  ))
  result.push(recordAchievement(
    'marathonsurvivor', 'Marathon Defeat', "Lose the pod's longest game on record.",
    ownDurations(asc, false), podLongest, 'max',
    s => `Defeated in a ${formatDuration(s)} game`, s => `Record: ${formatDuration(s)}`,
    (m, r) => `Longest loss: ${formatDuration(m)} • Record: ${formatDuration(r)}`,
    'No timed losses yet.', 'No timed games yet.',
  ))

  // Format / Champion
  const digi = triggeredInfo(asc, 'digitalchampion')
  const irl = triggeredInfo(asc, 'irlchampion')
  result.push({
    id: 'digitalchampion', title: 'Digital Champion', description: 'Win a remote game.', category: 'Format & Champion',
    isEarned: digi.count > 0, progress: digi.count > 0 ? `Earned ${digi.count} time${digi.count === 1 ? '' : 's'}` : 'Win a remote game.',
    earnedDate: digi.firstDate,
  })
  result.push({
    id: 'irlchampion', title: 'IRL Champion', description: 'Win an in-person game.', category: 'Format & Champion',
    isEarned: irl.count > 0, progress: irl.count > 0 ? `Earned ${irl.count} time${irl.count === 1 ? '' : 's'}` : 'Win an in-person game.',
    earnedDate: irl.firstDate,
  })
  const diplomatEarned = digi.count > 0 && irl.count > 0
  const diplomatDate = diplomatEarned && digi.firstDate && irl.firstDate
    ? (digi.firstDate > irl.firstDate ? digi.firstDate : irl.firstDate) : null
  result.push({
    id: 'formatdiplomat', title: 'Format Diplomat', description: 'Win in both in-person and remote games.', category: 'Format & Champion',
    isEarned: diplomatEarned,
    progress: diplomatEarned ? 'Unlocked' : `Need wins in both formats (${digi.count > 0 ? '✓' : '✗'} remote, ${irl.count > 0 ? '✓' : '✗'} in-person).`,
    earnedDate: diplomatDate,
  })

  let lastInPerson: boolean | null = null, lastRemote: boolean | null = null
  let ultimateCount = 0, ultimateDate: string | null = null
  for (const x of asc) {
    const wasUltimate = lastInPerson === true && lastRemote === true
    if (x.game.isInPerson) lastInPerson = x.part.didWin
    else lastRemote = x.part.didWin
    const isUltimate = lastInPerson === true && lastRemote === true
    if (isUltimate && !wasUltimate) { ultimateCount++; ultimateDate = x.date }
  }
  result.push({
    id: 'ultimatechampion', title: 'Ultimate Champion', description: 'Simultaneously hold the Digichampion and IRLchampion crowns.', category: 'Format & Champion',
    isEarned: ultimateCount > 0,
    progress: ultimateCount > 0 ? `Earned ${ultimateCount} time${ultimateCount === 1 ? '' : 's'}` : 'Simultaneously hold the crown for both formats.',
    earnedDate: ultimateDate,
  })

  // Game moments (per-game triggered / note-matched) — Pacifist/Fly On The
  // Wall/52 Pickup/Nice are player-only, same as the Mac app.
  const moments: { id: string; title: string; description: string; prompt: string }[] = [
    { id: 'firstblood', title: 'First Blood', description: 'Win a game after going first.', prompt: 'Win a game going first.' },
    { id: 'comefrombehind', title: 'Come From Behind', description: 'Win a game after going last.', prompt: 'Win from the last turn position.' },
    { id: 'botchedit', title: 'Botched It', description: 'Go first but finish last.', prompt: 'Go first and finish last.' },
    // Pacifist and Fly On The Wall are checked per-participation (whoever
    // piloted that game), so unlike 52 Pickup/Nice below they apply equally
    // to commander catalogs, not just player ones.
    { id: 'pacifist', title: 'Pacifist', description: 'Play an entire game without attacking another player.', prompt: 'Play a game without attacking anyone.' },
    { id: 'flyonthewall', title: 'Fly On The Wall', description: 'Play an entire game without dealing any damage.', prompt: 'Play a game without dealing any damage.' },
    { id: 'nat20-win', title: 'Critical Success', description: 'Roll a natural 20 at the start of the game and win.', prompt: 'Roll a nat 20 and win the game.' },
    { id: 'nat20-loss', title: 'Rolled Well, Played Poorly', description: 'Roll a natural 20 at the start of the game and still lose.', prompt: 'Roll a nat 20 and lose anyway.' },
    { id: 'nat1-win', title: 'Cursed But Clutch', description: 'Roll a natural 1 at the start of the game and still win.', prompt: 'Roll a nat 1 and win anyway.' },
    { id: 'nat1-loss', title: 'Critical Failure', description: 'Roll a natural 1 at the start of the game and lose.', prompt: 'Roll a nat 1 and lose.' },
    { id: 'solring1-win', title: 'Sol Ring, GG', description: 'Play Sol Ring on turn 1 and win the game.', prompt: 'Play a turn-1 Sol Ring and win.' },
    { id: 'solring1-loss', title: "Sol Ring Wasn't Enough", description: 'Play Sol Ring on turn 1 and still lose.', prompt: 'Play a turn-1 Sol Ring and lose anyway.' },
    { id: 'commanderdamagekill', title: 'Commander Damage!', description: 'Eliminate another player with 21+ commander damage.', prompt: 'Kill someone with commander damage.' },
    ...(showPlayerOnly ? [
      { id: '52pickup', title: 'Oops, Butterfingers', description: 'Drop your cards on the floor.', prompt: 'Drop your cards on the floor.' },
      { id: 'nice', title: 'Nice', description: 'End the game with exactly 69 life.', prompt: 'End a game with 69 life.' },
    ] : []),
  ]
  for (const m of moments) {
    const info = triggeredInfo(asc, m.id)
    result.push({
      id: m.id, title: m.title, description: m.description, category: 'Game Moments',
      isEarned: info.count > 0, progress: info.count > 0 ? `Earned ${info.count} time${info.count === 1 ? '' : 's'}` : m.prompt,
      earnedDate: info.firstDate,
    })
  }

  if (showPlayerOnly) {
    result.push({
      id: 'hattrick', title: 'Hat Trick', description: 'Win three games in a row.', category: 'Streaks',
      isEarned: bestWin >= 3,
      progress: bestWin >= 3 ? `Unlocked (best streak: ${bestWin})` : bestWin === 0 ? 'No win streak yet.' : `Best win streak: ${bestWin} of 3`,
      earnedDate: hattrickDate,
    })
  }

  // Veteran tiers
  for (const n of [25, 50, 75, 100]) {
    const earned = asc.length >= n
    result.push({
      id: `games-${n}`, title: `${n} Games`, description: `Play ${n} total games.`, category: 'Veteran',
      isEarned: earned, progress: earned ? 'Unlocked' : `${asc.length} of ${n} games`,
      earnedDate: earned ? asc[n - 1].date : null,
    })
  }

  if (showPlayerOnly) {
    // Connoisseur / Loyal Pilot
    let connoisseurDate: string | null = null
    const seenCombos = new Set<string>()
    for (const x of asc) {
      const key = comboKey(x.part)
      if (!key) continue
      seenCombos.add(key)
      if (!connoisseurDate && seenCombos.size >= 5) connoisseurDate = x.date
    }
    result.push({
      id: 'connoisseur', title: 'Connoisseur', description: 'Play 5+ distinct commanders.', category: 'Commanders',
      isEarned: seenCombos.size >= 5, progress: seenCombos.size >= 5 ? `Unlocked (${seenCombos.size} commanders)` : `${seenCombos.size} of 5 distinct commanders`,
      earnedDate: connoisseurDate,
    })

    let loyalDate: string | null = null
    let loyalAchieved = false
    const comboCounts: Record<string, number> = {}
    for (const x of asc) {
      const key = comboKey(x.part)
      if (!key) continue
      comboCounts[key] = (comboCounts[key] ?? 0) + 1
      if (!loyalAchieved && comboCounts[key] >= 10) { loyalAchieved = true; loyalDate = x.date }
    }
    const loyalMax = Object.values(comboCounts).reduce((max, n) => Math.max(max, n), 0)
    result.push({
      id: 'loyalpilot', title: 'Loyal Pilot', description: 'Play the same commander 10+ times.', category: 'Commanders',
      isEarned: loyalMax >= 10, progress: loyalMax >= 10 ? `Unlocked (${loyalMax} games)` : `${loyalMax} games with favorite commander`,
      earnedDate: loyalDate,
    })

    // Color mastery
    const mono = new Set<string>(), dual = new Set<string>(), tri = new Set<string>()
    let monoDate: string | null = null, dualDate: string | null = null, triDate: string | null = null, rainbowDate: string | null = null
    for (const x of asc) {
      if (!x.part.didWin || !x.part.resolvedColorIdentity) continue
      const colors = x.part.resolvedColorIdentity.filter(c => WUBRG.includes(c))
      const key = WUBRG.filter(c => colors.includes(c)).join('')
      if (colors.length === 5 && !rainbowDate) rainbowDate = x.date
      switch (colors.length) {
        case 0: mono.add('C'); break
        case 1: mono.add(key); break
        case 2: dual.add(key); break
        case 3: tri.add(key); break
        default: break
      }
      if (mono.size === 6 && !monoDate) monoDate = x.date
      if (dual.size === 10 && !dualDate) dualDate = x.date
      if (tri.size === 10 && !triDate) triDate = x.date
    }
    result.push({
      id: 'monomaster', title: 'Mono-Master', description: 'Win with a commander of each of the 6 mono-color identities (W/U/B/R/G/Colorless).', category: 'Color Mastery',
      isEarned: mono.size === 6, progress: mono.size === 6 ? 'Unlocked' : `${mono.size} of 6 mono-color identities won`,
      earnedDate: monoDate,
    })
    result.push({
      id: 'dualmaster', title: 'Dual-Master', description: 'Win with all 10 dual-color commander combinations.', category: 'Color Mastery',
      isEarned: dual.size === 10, progress: dual.size === 10 ? 'Unlocked (all 10 combos)' : `${dual.size} of 10 dual-color combinations won`,
      earnedDate: dualDate,
    })
    result.push({
      id: 'trimaster', title: 'Tri-Master', description: 'Win with all 10 tri-color commander combinations.', category: 'Color Mastery',
      isEarned: tri.size === 10, progress: tri.size === 10 ? 'Unlocked (all 10 combos)' : `${tri.size} of 10 tri-color combinations won`,
      earnedDate: triDate,
    })
    result.push({
      id: 'tastetherainbow', title: 'Taste the Rainbow', description: 'Win a game with a 5-color (WUBRG) commander.', category: 'Color Mastery',
      isEarned: !!rainbowDate, progress: rainbowDate ? 'Unlocked' : 'Win with a 5-color commander.',
      earnedDate: rainbowDate,
    })

    // Player-specific achievements — only shown for the matching player, same as the Mac app.
    const lowerName = (playerName as string).toLowerCase()
    const personal: { match: string; id: string; title: string; description: string }[] = [
      { match: 'jake', id: 'jake-wizard', title: 'Wizard, You Shall Not Cast', description: "Jake doesn't cast a spell in his first three turns." },
      { match: 'margolis', id: 'margolis-graveyard', title: 'Graveyard!?', description: 'Margolis mixes up his hand and graveyard.' },
      { match: 'pertman', id: 'pertman-wait', title: 'WAIT!', description: 'Pertman yells "wait" after his turn more than once in a single game.' },
      { match: 'noah', id: 'noah-matthew', title: '404 Error: Thumb Not Found', description: 'Matthew wakes up and ruins the last game of the evening.' },
      { match: 'justin', id: 'justin-rat', title: 'Clamp Me Daddy', description: 'Justin skullclamps a rat.' },
      { match: 'max', id: 'max-zeus', title: 'Look What the Zeus Dragged In', description: 'Max graces the table with his presence.' },
    ]
    for (const p of personal) {
      if (!lowerName.includes(p.match)) continue
      const info = triggeredInfo(asc, p.id)
      result.push({
        id: p.id, title: p.title, description: p.description, category: 'Individual',
        isEarned: info.count > 0, progress: info.count > 0 ? `Earned ${info.count} time${info.count === 1 ? '' : 's'}` : 'Not yet earned.',
        earnedDate: info.firstDate,
      })
    }
  } else {
    // Popular Commander — commander-only, based on distinct pilots.
    let popularDate: string | null = null
    const seenPilots = new Set<string>()
    for (const x of asc) {
      seenPilots.add(x.part.playerName)
      if (!popularDate && seenPilots.size >= 3) popularDate = x.date
    }
    result.push({
      id: 'popularcommander', title: 'Popular Commander', description: 'Be piloted by 3+ different players.', category: 'Commanders',
      isEarned: seenPilots.size >= 3, progress: seenPilots.size >= 3 ? `Unlocked (${seenPilots.size} pilots)` : `${seenPilots.size} of 3 distinct pilots`,
      earnedDate: popularDate,
    })
  }

  return result.map(a => ({ ...a, progress: clean(a.progress) }))
}

export function computePlayerAchievementCatalog(games: GameData[], playerName: string): CatalogAchievement[] {
  const asc = [...playerParticipations(games, playerName)].sort((a, b) => a.date.localeCompare(b.date))
  const desc = [...asc].sort((a, b) => b.date.localeCompare(a.date))
  return buildCatalog(games, asc, desc, playerName)
}

export function computeCommanderAchievementCatalog(games: GameData[], commanderName: string): CatalogAchievement[] {
  const asc = [...commanderParticipations(games, commanderName)].sort((a, b) => a.date.localeCompare(b.date))
  const desc = [...asc].sort((a, b) => b.date.localeCompare(a.date))
  return buildCatalog(games, asc, desc, null)
}

// Static reference list of every achievement type, for the standalone
// /achievements catalog page — titles/descriptions only, no per-player state.
export const ACHIEVEMENT_REFERENCE: { id: string; title: string; description: string; category: string }[] = [
  ...[5, 10, 15, 20].map(n => ({ id: `wins-${n}`, title: `${n} Wins`, description: `Win ${n} games.`, category: 'Win Milestones' })),
  ...[5, 10, 15, 20].map(n => ({ id: `losses-${n}`, title: `${n} Losses`, description: `Lose ${n} games.`, category: 'Loss Milestones' })),
  { id: 'winstreak', title: 'Win Streak', description: 'Consecutive wins since the last loss.', category: 'Streaks' },
  { id: 'bestwinstreak', title: 'Best Win Streak', description: 'The longest winning streak ever.', category: 'Streaks' },
  { id: 'lossstreak', title: 'Loss Streak', description: 'Consecutive losses since the last win.', category: 'Streaks' },
  { id: 'bestlossstreak', title: 'Worst Loss Streak', description: 'The longest losing streak ever.', category: 'Streaks' },
  { id: 'hattrick', title: 'Hat Trick', description: 'Win three games in a row.', category: 'Streaks' },
  { id: 'quickwin', title: 'Quickest Win', description: "Win the pod's fastest game on record.", category: 'Speed & Endurance' },
  { id: 'quickloss', title: 'Quickest Loss', description: "Lose the pod's fastest game on record.", category: 'Speed & Endurance' },
  { id: 'marathonwinner', title: 'Marathon Winner', description: "Win the pod's longest game on record.", category: 'Speed & Endurance' },
  { id: 'marathonsurvivor', title: 'Marathon Defeat', description: "Lose the pod's longest game on record.", category: 'Speed & Endurance' },
  { id: 'digitalchampion', title: 'Digital Champion', description: 'Win a remote game.', category: 'Format & Champion' },
  { id: 'irlchampion', title: 'IRL Champion', description: 'Win an in-person game.', category: 'Format & Champion' },
  { id: 'formatdiplomat', title: 'Format Diplomat', description: 'Win in both in-person and remote games.', category: 'Format & Champion' },
  { id: 'ultimatechampion', title: 'Ultimate Champion', description: 'Simultaneously hold the Digichampion and IRLchampion crowns.', category: 'Format & Champion' },
  { id: 'firstblood', title: 'First Blood', description: 'Win a game after going first.', category: 'Game Moments' },
  { id: 'comefrombehind', title: 'Come From Behind', description: 'Win a game after going last.', category: 'Game Moments' },
  { id: 'botchedit', title: 'Botched It', description: 'Go first but finish last.', category: 'Game Moments' },
  { id: 'pacifist', title: 'Pacifist', description: 'Play an entire game without attacking another player.', category: 'Game Moments' },
  { id: 'flyonthewall', title: 'Fly On The Wall', description: 'Play an entire game without dealing any damage.', category: 'Game Moments' },
  { id: 'nat20-win', title: 'Critical Success', description: 'Roll a natural 20 at the start of the game and win.', category: 'Game Moments' },
  { id: 'nat20-loss', title: 'Rolled Well, Played Poorly', description: 'Roll a natural 20 at the start of the game and still lose.', category: 'Game Moments' },
  { id: 'nat1-win', title: 'Cursed But Clutch', description: 'Roll a natural 1 at the start of the game and still win.', category: 'Game Moments' },
  { id: 'nat1-loss', title: 'Critical Failure', description: 'Roll a natural 1 at the start of the game and lose.', category: 'Game Moments' },
  { id: 'solring1-win', title: 'Sol Ring, GG', description: 'Play Sol Ring on turn 1 and win the game.', category: 'Game Moments' },
  { id: 'solring1-loss', title: "Sol Ring Wasn't Enough", description: 'Play Sol Ring on turn 1 and still lose.', category: 'Game Moments' },
  { id: 'commanderdamagekill', title: 'Commander Damage!', description: 'Eliminate another player with 21+ commander damage.', category: 'Game Moments' },
  { id: '52pickup', title: 'Oops, Butterfingers', description: 'Drop your cards on the floor.', category: 'Game Moments' },
  { id: 'nice', title: 'Nice', description: 'End the game with exactly 69 life.', category: 'Game Moments' },
  ...[25, 50, 75, 100].map(n => ({ id: `games-${n}`, title: `${n} Games`, description: `Play ${n} total games.`, category: 'Veteran' })),
  { id: 'connoisseur', title: 'Connoisseur', description: 'Play 5+ distinct commanders.', category: 'Commanders' },
  { id: 'loyalpilot', title: 'Loyal Pilot', description: 'Play the same commander 10+ times.', category: 'Commanders' },
  { id: 'popularcommander', title: 'Popular Commander', description: 'Be piloted by 3+ different players.', category: 'Commanders' },
  { id: 'monomaster', title: 'Mono-Master', description: 'Win with a commander of each of the 6 mono-color identities (W/U/B/R/G/Colorless).', category: 'Color Mastery' },
  { id: 'dualmaster', title: 'Dual-Master', description: 'Win with all 10 dual-color commander combinations.', category: 'Color Mastery' },
  { id: 'trimaster', title: 'Tri-Master', description: 'Win with all 10 tri-color commander combinations.', category: 'Color Mastery' },
  { id: 'tastetherainbow', title: 'Taste the Rainbow', description: 'Win a game with a 5-color (WUBRG) commander.', category: 'Color Mastery' },
  { id: 'jake-wizard', title: 'Wizard, You Shall Not Cast', description: "Jake doesn't cast a spell in his first three turns.", category: 'Individual' },
  { id: 'margolis-graveyard', title: 'Graveyard!?', description: 'Margolis mixes up his hand and graveyard.', category: 'Individual' },
  { id: 'pertman-wait', title: 'WAIT!', description: 'Pertman yells "wait" after his turn more than once in a single game.', category: 'Individual' },
  { id: 'noah-matthew', title: '404 Error: Thumb Not Found', description: 'Matthew wakes up and ruins the last game of the evening.', category: 'Individual' },
  { id: 'justin-rat', title: 'Clamp Me Daddy', description: 'Justin skullclamps a rat.', category: 'Individual' },
  { id: 'max-zeus', title: 'Look What the Zeus Dragged In', description: 'Max graces the table with his presence.', category: 'Individual' },
]
