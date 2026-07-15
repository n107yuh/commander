'use client'

import { useEffect, useState } from 'react'
import {
  type PendingGame, type PendingParticipant, type PendingGamesFile,
  needsColorIdentityChoice, formatIsoNoMillis, newEmptyParticipant, newEmptyGame,
} from '@/lib/logSchema'
import { CommanderCombobox } from './CommanderCombobox'

const STORAGE_KEY = 'commander-lite-log-queue-v1'
const COLORS = ['W', 'U', 'B', 'R', 'G', 'C']
const COLOR_BG: Record<string, string> = {
  W: 'bg-amber-100 text-slate-900', U: 'bg-blue-500', B: 'bg-black ring-1 ring-slate-600',
  R: 'bg-red-600', G: 'bg-green-700', C: 'bg-slate-400 text-slate-900',
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

function toLocalInputValue(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : formatIsoNoMillis(d)
}

export function GameLogForm({ knownPlayers, knownCommanders }: { knownPlayers: string[]; knownCommanders: string[] }) {
  const [queue, setQueue] = useState<PendingGame[]>([])
  const [current, setCurrent] = useState<PendingGame>(newEmptyGame)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Names confirmed to be real commander-legal cards — seeded with everyone
  // the pod has already played, and grown as Scryfall confirms new ones this
  // session. Shared across every commander field so a name only ever needs
  // checking once.
  const [confirmedValid, setConfirmedValid] = useState<Set<string>>(
    () => new Set(knownCommanders.map(n => n.toLowerCase()))
  )
  function confirmValid(name: string) {
    setConfirmedValid(prev => {
      const lower = name.trim().toLowerCase()
      if (prev.has(lower)) return prev
      const next = new Set(prev)
      next.add(lower)
      return next
    })
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setQueue(JSON.parse(raw))
    } catch { /* ignore corrupt/missing storage */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  }, [queue, loaded])

  function updateParticipant(index: number, patch: Partial<PendingParticipant>) {
    setCurrent(g => ({
      ...g,
      participants: g.participants.map((p, i) => i === index ? { ...p, ...patch } : p),
    }))
  }

  function move(index: number, dir: -1 | 1) {
    setCurrent(g => {
      const next = [...g.participants]
      const j = index + dir
      if (j < 0 || j >= next.length) return g
      ;[next[index], next[j]] = [next[j], next[index]]
      return { ...g, participants: next }
    })
  }

  function addParticipant() {
    setCurrent(g => ({ ...g, participants: [...g.participants, newEmptyParticipant()] }))
  }

  function removeParticipant(index: number) {
    setCurrent(g => ({ ...g, participants: g.participants.filter((_, i) => i !== index) }))
  }

  const namedCount = current.participants.filter(p => p.playerName.trim()).length
  const namedParticipants = current.participants.filter(p => p.playerName.trim())
  const allCommandersValid = namedParticipants.every(p => {
    const main = p.commanderName.trim()
    const partner = p.partnerCommanderName?.trim()
    const mainOk = !main || confirmedValid.has(main.toLowerCase())
    const partnerOk = !partner || confirmedValid.has(partner.toLowerCase())
    return mainOk && partnerOk
  })
  const canQueue = namedCount >= 2 && allCommandersValid

  function queueGame() {
    if (!canQueue) return
    const trimmed: PendingGame = {
      ...current,
      participants: current.participants
        .filter(p => p.playerName.trim())
        .map(p => ({
          ...p,
          playerName: p.playerName.trim(),
          commanderName: p.commanderName.trim(),
          partnerCommanderName: p.partnerCommanderName?.trim() || null,
        })),
    }
    setQueue(q => [...q, trimmed])
    setCurrent(newEmptyGame())
    setMessage(`Added to queue (${queue.length + 1} game${queue.length + 1 === 1 ? '' : 's'} queued).`)
  }

  function removeQueued(index: number) {
    setQueue(q => q.filter((_, i) => i !== index))
  }

  function clearQueue() {
    if (!confirm('Clear all queued games? This cannot be undone.')) return
    setQueue([])
  }

  function exportQueue() {
    if (queue.length === 0) return
    const file: PendingGamesFile = { formatVersion: 1, submittedAt: formatIsoNoMillis(new Date()), games: queue }
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `commander-games-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMessage('Downloaded. Send this file to Noah to import into the main app.')
  }

  const takenTurnOrders = new Set(current.participants.map(p => p.turnOrder).filter(t => t >= 0))

  return (
    <div className="space-y-6">
      {queue.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Queued Games ({queue.length})
            </h2>
            <div className="flex gap-3">
              <button onClick={clearQueue} className="text-xs text-slate-500 hover:text-red-400">Clear</button>
              <button onClick={exportQueue} className="text-xs font-semibold text-violet-400 hover:text-violet-300">
                Export & Download →
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {queue.map((g, i) => {
              const winner = g.participants[0]
              return (
                <div key={i} className="flex items-center justify-between text-sm bg-slate-800/50 rounded-md px-3 py-2">
                  <span className="text-slate-300">
                    {new Date(g.date).toLocaleString()} · {g.isInPerson ? '🏠' : '💻'} ·{' '}
                    <span className="text-emerald-400">{winner?.playerName ?? '?'}</span> won
                    {' '}({g.participants.length} players)
                  </span>
                  <button onClick={() => removeQueued(i)} className="text-slate-500 hover:text-red-400 text-xs shrink-0 ml-2">
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {message && (
        <div className="text-sm text-violet-300 bg-violet-950/40 border border-violet-900 rounded-lg px-4 py-2.5">
          {message}
        </div>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Game</h2>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-500">Start</span>
            <input
              type="datetime-local"
              value={toLocalInputValue(current.date)}
              onChange={e => {
                const newStart = fromLocalInputValue(e.target.value)
                if (!newStart) return
                const oldStart = new Date(current.date).getTime()
                const oldEnd = current.endTime ? new Date(current.endTime).getTime() : oldStart
                const delta = Math.max(0, oldEnd - oldStart)
                setCurrent(g => ({ ...g, date: newStart, endTime: formatIsoNoMillis(new Date(new Date(newStart).getTime() + delta)) }))
              }}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">End</span>
            <input
              type="datetime-local"
              value={toLocalInputValue(current.endTime)}
              onChange={e => setCurrent(g => ({ ...g, endTime: fromLocalInputValue(e.target.value) }))}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
            />
          </label>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-slate-300">
            <input type="radio" checked={current.isInPerson} onChange={() => setCurrent(g => ({ ...g, isInPerson: true }))} />
            Played in person
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-300">
            <input type="radio" checked={!current.isInPerson} onChange={() => setCurrent(g => ({ ...g, isInPerson: false }))} />
            Played digitally
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Players</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Enter players in finish order — winner first, then the last person eliminated, and so on. The bottom row is the first player eliminated.
          </p>

          <div className="space-y-3">
            {current.participants.map((p, i) => (
              <ParticipantRow
                key={i}
                index={i}
                total={current.participants.length}
                participant={p}
                takenTurnOrders={takenTurnOrders}
                onChange={patch => updateParticipant(i, patch)}
                onMoveUp={i > 0 ? () => move(i, -1) : undefined}
                onMoveDown={i < current.participants.length - 1 ? () => move(i, 1) : undefined}
                onRemove={current.participants.length > 2 ? () => removeParticipant(i) : undefined}
                confirmedValid={confirmedValid}
                onConfirmValid={confirmValid}
              />
            ))}
          </div>

          <button onClick={addParticipant} className="mt-3 text-xs font-semibold text-violet-400 hover:text-violet-300">
            + Add Player
          </button>
        </div>

        <datalist id="known-players">
          {knownPlayers.map(n => <option key={n} value={n} />)}
        </datalist>

        <label className="block">
          <span className="text-xs text-slate-500">Notable Moments</span>
          <textarea
            value={current.notes}
            onChange={e => setCurrent(g => ({ ...g, notes: e.target.value }))}
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white min-h-[80px]"
            placeholder="Anything notable that happened this game…"
          />
        </label>

        <button
          onClick={queueGame}
          disabled={!canQueue}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors"
        >
          Add Game to Queue
        </button>
        {namedCount >= 2 && !allCommandersValid && (
          <p className="text-xs text-red-400 text-center -mt-3">
            Fix the commander names marked in red before queueing this game.
          </p>
        )}
      </section>
    </div>
  )
}

function ParticipantRow({
  index, total, participant, takenTurnOrders, onChange, onMoveUp, onMoveDown, onRemove, confirmedValid, onConfirmValid,
}: {
  index: number
  total: number
  participant: PendingParticipant
  takenTurnOrders: Set<number>
  onChange: (patch: Partial<PendingParticipant>) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onRemove?: () => void
  confirmedValid: Set<string>
  onConfirmValid: (name: string) => void
}) {
  const placementLabel = index === 0 ? 'Winner' : ordinal(index + 1)
  const showColorPicker = needsColorIdentityChoice(participant.commanderName)
    || (!!participant.partnerCommanderName && needsColorIdentityChoice(participant.partnerCommanderName))

  function toggleColor(c: string) {
    const has = participant.chosenColorIdentity.includes(c)
    onChange({
      chosenColorIdentity: has
        ? participant.chosenColorIdentity.filter(x => x !== c)
        : [...participant.chosenColorIdentity, c],
    })
  }

  return (
    <div className="flex gap-3 bg-slate-800/40 border border-slate-800 rounded-lg p-3">
      <div className="flex flex-col items-center gap-1.5 shrink-0 w-16">
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full text-center ${index === 0 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-700 text-slate-300'}`}>
          {index === 0 ? '👑 ' : ''}{placementLabel}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={onMoveUp} disabled={!onMoveUp} className="text-slate-500 disabled:opacity-20 hover:text-white text-xs">▲</button>
          <button type="button" onClick={onMoveDown} disabled={!onMoveDown} className="text-slate-500 disabled:opacity-20 hover:text-white text-xs">▼</button>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <input
            list="known-players"
            placeholder="Player name"
            value={participant.playerName}
            onChange={e => onChange({ playerName: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white min-w-0"
          />
          <select
            value={participant.turnOrder}
            onChange={e => onChange({ turnOrder: Number(e.target.value) })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white w-24"
            title="Starting turn order"
          >
            <option value={-1}>Turn —</option>
            {Array.from({ length: total }, (_, i) => i).map(i => (
              <option key={i} value={i} disabled={takenTurnOrders.has(i) && participant.turnOrder !== i}>
                {ordinal(i + 1)}
              </option>
            ))}
          </select>
          <select
            value={participant.openingHandSize}
            onChange={e => onChange({ openingHandSize: Number(e.target.value) })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white w-20"
            title="Opening hand size after mulligans"
          >
            {[7, 6, 5, 4, 3].map(n => <option key={n} value={n}>{n} cards</option>)}
          </select>
        </div>

        <CommanderCombobox
          value={participant.commanderName}
          onChange={name => onChange({ commanderName: name })}
          placeholder="Commander"
          confirmedValid={confirmedValid}
          onConfirm={onConfirmValid}
        />

        {participant.partnerCommanderName !== null ? (
          <div className="flex gap-2 items-start">
            <div className="flex-1 min-w-0">
              <CommanderCombobox
                value={participant.partnerCommanderName}
                onChange={name => onChange({ partnerCommanderName: name })}
                placeholder="Partner commander"
                confirmedValid={confirmedValid}
                onConfirm={onConfirmValid}
              />
            </div>
            <button type="button" onClick={() => onChange({ partnerCommanderName: null })} className="text-slate-500 hover:text-red-400 text-xs shrink-0 pt-1.5">
              Remove
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => onChange({ partnerCommanderName: '' })} className="text-xs text-violet-400 hover:text-violet-300">
            + Add Partner Commander
          </button>
        )}

        {showColorPicker && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Identity:</span>
            {COLORS.map(c => {
              const selected = participant.chosenColorIdentity.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleColor(c)}
                  className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${selected ? COLOR_BG[c] : 'bg-slate-700 text-slate-500'}`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {onRemove && (
        <button type="button" onClick={onRemove} className="text-slate-600 hover:text-red-400 shrink-0 self-start">✕</button>
      )}
    </div>
  )
}
