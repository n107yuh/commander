'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const links = [
  { href: '/',             label: 'Dashboard' },
  { href: '/players',      label: 'Players' },
  { href: '/commanders',   label: 'Commanders' },
  { href: '/annals',       label: 'Annals' },
  { href: '/achievements', label: 'Achievements' },
]

export function Nav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile dropdown whenever the route actually changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link href="/" className="font-bold text-violet-400 tracking-tight shrink-0">
          ⚔️ Commander Tracker
        </Link>

        {/* Desktop nav — hidden on small screens, replaced by the hamburger below */}
        <nav className="hidden sm:flex gap-1 overflow-x-auto">
          {links.map(l => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
                  active ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/log"
            className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
              pathname.startsWith('/log') ? 'bg-violet-600 text-white' : 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30'
            }`}
          >
            Log a Game
          </Link>

          {/* Hamburger toggle — only rendered on small screens */}
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="sm:hidden shrink-0 p-2 -mr-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              {menuOpen ? (
                <path d="M5 5L15 15M15 5L5 15" />
              ) : (
                <path d="M3 5.5H17M3 10H17M3 14.5H17" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-slate-800 px-4 py-2 flex flex-col">
          {links.map(l => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
