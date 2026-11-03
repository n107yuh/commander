'use client'

import { useCallback, useLayoutEffect, useEffect, useState } from 'react'
import { COMMANDER_SORT_OPTIONS, type CommanderSortKey } from '@/lib/commanderSort'

const COLOR_OPTIONS = ['W', 'U', 'B', 'R', 'G', 'C']

// useLayoutEffect warns during server rendering; fall back to useEffect there.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// A string state value mirrored into the page's query string (e.g. /commanders?sort=winsDesc), so
// the browser's Back button restores it: Back returns to the same URL, and the list re-reads its
// controls from it. A value equal to its default is left out of the URL, so a normal visit to the
// page stays clean and starts at the default. Written with replaceState (no new history entries),
// passing the existing history state through so Next's router bookkeeping is preserved.
function useUrlParam(key: string, defaultValue: string): [string, (value: string) => void] {
  const [value, setValue] = useState(defaultValue)

  // Read before first paint so Back doesn't flash the default order first.
  useIsoLayoutEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(key)
    if (fromUrl !== null) setValue(fromUrl)
  }, [key])

  const update = useCallback((next: string) => {
    setValue(next)
    const params = new URLSearchParams(window.location.search)
    if (next === defaultValue) params.delete(key)
    else params.set(key, next)
    const query = params.toString()
    window.history.replaceState(window.history.state, '', query ? `?${query}` : window.location.pathname)
  }, [key, defaultValue])

  return [value, update]
}

// The filter/sort/view controls shared by every commander list (Commander Records, 1v1, and a
// player's commanders). All of it lives in the URL — see useUrlParam.
export function useCommanderListControls(defaultSort: CommanderSortKey) {
  const [sortRaw, setSortRaw] = useUrlParam('sort', defaultSort)
  const [viewRaw, setViewRaw] = useUrlParam('view', 'grid')
  const [colorsRaw, setColorsRaw] = useUrlParam('colors', '')
  // Kept as raw strings (not numbers) so the field can be fully cleared while typing.
  const [minWinRateStr, setMinWinRateStr] = useUrlParam('min', '0')
  const [maxWinRateStr, setMaxWinRateStr] = useUrlParam('max', '100')

  const sortKey: CommanderSortKey = COMMANDER_SORT_OPTIONS.some(o => o.value === sortRaw)
    ? (sortRaw as CommanderSortKey)
    : defaultSort
  const view: 'grid' | 'list' = viewRaw === 'list' ? 'list' : 'grid'
  const selectedColors = new Set(colorsRaw.split('').filter(c => COLOR_OPTIONS.includes(c)))

  function setSelectedColors(next: Set<string>) {
    setColorsRaw(COLOR_OPTIONS.filter(c => next.has(c)).join(''))
  }

  return {
    sortKey, setSortKey: (key: CommanderSortKey) => setSortRaw(key),
    view, setView: (v: 'grid' | 'list') => setViewRaw(v),
    selectedColors, setSelectedColors,
    minWinRateStr, setMinWinRateStr,
    maxWinRateStr, setMaxWinRateStr,
  }
}
