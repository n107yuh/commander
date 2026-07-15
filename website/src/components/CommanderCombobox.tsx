'use client'

import { useRef, useState } from 'react'
import { searchCommanders, isValidCommander } from '@/lib/scryfall'

type Status = 'idle' | 'checking' | 'valid' | 'invalid' | 'unverifiable'

export function CommanderCombobox({
  value, onChange, placeholder, confirmedValid, onConfirm,
}: {
  value: string
  onChange: (name: string) => void
  placeholder: string
  // Lowercased names already known to be real commanders (pod history plus
  // anything already confirmed via Scryfall this session) — checked before
  // hitting the network, and shared across every commander field on the page.
  confirmedValid: Set<string>
  onConfirm: (name: string) => void
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>(() =>
    value.trim() && confirmedValid.has(value.trim().toLowerCase()) ? 'valid' : 'idle'
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)

  function handleInput(text: string) {
    onChange(text)
    setOpen(true)
    const trimmed = text.trim()
    setStatus(trimmed && confirmedValid.has(trimmed.toLowerCase()) ? 'valid' : 'idle')

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
  }

  async function handleBlur() {
    // Delay so a suggestion click (which also blurs the input) registers first.
    setTimeout(() => setOpen(false), 150)
    const trimmed = value.trim()
    if (!trimmed) { setStatus('idle'); return }
    if (confirmedValid.has(trimmed.toLowerCase())) { setStatus('valid'); return }

    setStatus('checking')
    const controller = new AbortController()
    abortRef.current = controller
    const valid = await isValidCommander(trimmed, controller.signal)
    if (controller.signal.aborted) return
    if (valid) {
      setStatus('valid')
      onConfirm(trimmed)
    } else {
      setStatus('invalid')
    }
  }

  const borderClass = status === 'invalid' ? 'border-red-600'
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
      {status === 'invalid' && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-xs">✗</span>
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

      {status === 'invalid' && (
        <p className="text-[11px] text-red-400 mt-0.5">Not a recognized commander — pick one from the list.</p>
      )}
    </div>
  )
}
