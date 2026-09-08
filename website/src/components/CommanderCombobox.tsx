'use client'

import { useRef, useState } from 'react'
import { searchCommanders, isValidCommander } from '@/lib/scryfall'

type Status = 'idle' | 'checking' | 'valid' | 'unverifiable'

export function CommanderCombobox({
  value, onChange, placeholder, confirmedValid, unverifiedNames, onConfirm, onUnverified,
}: {
  value: string
  onChange: (name: string) => void
  placeholder: string
  // Lowercased names already known to be real commanders (pod history plus
  // anything already confirmed via Scryfall this session) — checked before
  // hitting the network, and shared across every commander field on the page.
  confirmedValid: Set<string>
  // Lowercased names Scryfall couldn't confirm this session — kept separate
  // from confirmedValid (which a name lands in either way, so queueing isn't
  // blocked) so re-typing the same name in a different row still shows the
  // amber warning instead of a false green check.
  unverifiedNames: Set<string>
  onConfirm: (name: string) => void
  onUnverified: (name: string, unverified: boolean) => void
}) {
  const statusFor = (name: string): Status => {
    const lower = name.trim().toLowerCase()
    if (!lower) return 'idle'
    if (unverifiedNames.has(lower)) return 'unverifiable'
    if (confirmedValid.has(lower)) return 'valid'
    return 'idle'
  }

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>(() => statusFor(value))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)

  function handleInput(text: string) {
    onChange(text)
    setOpen(true)
    setStatus(statusFor(text))

    const trimmed = text.trim()
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    if (trimmed.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      const remote = await searchCommanders(trimmed, controller.signal)
      if (controller.signal.aborted) return
      setSuggestions(remote)
    }, 300)
  }

  function selectSuggestion(name: string) {
    onChange(name)
    setOpen(false)
    setStatus('valid')
    onConfirm(name)
    onUnverified(name, false)
  }

  async function handleBlur() {
    // Delay so a suggestion click (which also blurs the input) registers first.
    setTimeout(() => setOpen(false), 150)
    const trimmed = value.trim()
    if (!trimmed) { setStatus('idle'); return }
    const known = statusFor(trimmed)
    if (known !== 'idle') { setStatus(known); return }

    setStatus('checking')
    const controller = new AbortController()
    abortRef.current = controller
    const valid = await isValidCommander(trimmed, controller.signal)
    if (controller.signal.aborted) return
    // Scryfall not recognizing a name doesn't mean it's wrong — it just means
    // Scryfall hasn't indexed it yet (brand-new Universes Beyond commanders in
    // particular can lag behind release), or it's a homebrew/proxy the pod
    // actually plays with. Either way, don't block logging the game over it —
    // just flag it as unverified so a genuine typo is still easy to notice.
    setStatus(valid ? 'valid' : 'unverifiable')
    onConfirm(trimmed)
    onUnverified(trimmed, !valid)
  }

  const borderClass = status === 'unverifiable' ? 'border-amber-600'
    : status === 'valid' ? 'border-emerald-800'
    : 'border-slate-700'

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full bg-slate-900 border rounded px-2 py-1.5 pr-6 text-sm text-white ${borderClass}`}
        autoComplete="off"
      />
      {status === 'checking' && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">⋯</span>
      )}
      {status === 'valid' && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">✓</span>
      )}
      {status === 'unverifiable' && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 text-xs">⚠</span>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto bg-slate-800 border border-slate-700 rounded-md shadow-lg">
          {suggestions.map(name => (
            <button
              key={name}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => selectSuggestion(name)}
              className="block w-full text-left px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {status === 'unverifiable' && (
        <p className="text-[11px] text-amber-400 mt-0.5">
          Not found on Scryfall yet — double-check spelling, or set its color identity manually below if this is a new/homebrew card.
        </p>
      )}
    </div>
  )
}
