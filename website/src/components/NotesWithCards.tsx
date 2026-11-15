'use client'

import { useEffect, useRef, useState } from 'react'

const CARD_WIDTH = 244
const CARD_HEIGHT = 340
const MARGIN = 8

// Scryfall's fuzzy named lookup with format=image redirects straight to the card image, so it can
// be used as an <img> source with no API call of our own. Fuzzy matching also resolves printed /
// flavor names (e.g. Universes Beyond crossovers), same as the commander lookup elsewhere.
function cardImageUrl(name: string): string {
  return `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}&format=image&version=normal`
}

interface Placement {
  left: number
  top: number
}

function CardMention({ name }: { name: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [failed, setFailed] = useState(false)
  const open = placement !== null

  // Fixed positioning (computed from the name's on-screen box) keeps the pop-out from being clipped
  // by any scrolling/overflow container the notes sit in. It sits above the name when there's room,
  // otherwise below, and stays inside the viewport horizontally.
  function show() {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const above = rect.top > CARD_HEIGHT + MARGIN * 2
    setPlacement({
      left: Math.max(MARGIN, Math.min(rect.left + rect.width / 2 - CARD_WIDTH / 2, window.innerWidth - CARD_WIDTH - MARGIN)),
      top: above ? rect.top - CARD_HEIGHT - MARGIN : rect.bottom + MARGIN,
    })
  }

  function hide() {
    setPlacement(null)
  }

  // The pop-out is positioned for the scroll position it opened at, so close it when the page moves.
  useEffect(() => {
    if (!open) return
    const onScroll = () => setPlacement(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlacement(null) }
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <span
        ref={anchorRef}
        tabIndex={0}
        role="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        // Touch screens have no hover, so a tap toggles the pop-out.
        onClick={() => (open ? hide() : show())}
        className="text-violet-300 border-b border-dotted border-violet-400/60 cursor-help hover:text-violet-200 focus:outline-none focus:text-violet-200"
      >
        {name}
      </span>
      {open && (
        <span
          className="fixed z-50 pointer-events-none rounded-xl shadow-2xl ring-1 ring-slate-700 bg-slate-900 overflow-hidden"
          style={{ left: placement.left, top: placement.top, width: CARD_WIDTH, minHeight: failed ? 0 : CARD_HEIGHT }}
        >
          {failed ? (
            <span className="block px-3 py-2 text-xs text-slate-400">No card found for &ldquo;{name}&rdquo;</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cardImageUrl(name)} alt={name} width={CARD_WIDTH} className="block w-full h-auto" onError={() => setFailed(true)} />
          )}
        </span>
      )}
    </>
  )
}

// Renders game notes with every [[Card Name]] turned into a name you can hover (or tap) to see the
// card. Everything else is shown exactly as written.
export function NotesWithCards({ notes }: { notes: string }) {
  const parts = notes.split(/\[\[([^\[\]]+?)\]\]/g)
  // A name can't contain brackets, so a stray "[[" earlier in the notes can't swallow text up to a later "]]".
  // split() with one capture group alternates plain text (even indexes) and card names (odd).
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 && part.trim()
          ? <CardMention key={i} name={part.trim()} />
          : <span key={i}>{i % 2 === 1 ? `[[${part}]]` : part}</span>
      )}
    </>
  )
}
