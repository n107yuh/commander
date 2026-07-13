import Link from 'next/link'

const links = [
  { href: '/',            label: 'Dashboard' },
  { href: '/players',     label: 'Players' },
  { href: '/commanders',  label: 'Commanders' },
  { href: '/annals',      label: 'Annals' },
]

export function Nav() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link href="/" className="font-bold text-violet-400 tracking-tight shrink-0">
          ⚔️ Commander Tracker
        </Link>
        <nav className="flex gap-1 overflow-x-auto">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
