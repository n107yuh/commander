'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

// Makes an entire <tr> navigate to `href` on click. Replaces the old CSS-only
// "stretched link" pattern (position: relative on <tr>, an <a> with
// after:absolute after:inset-0) — that relies on <tr> being a valid containing
// block for an absolutely positioned descendant, which Safari/WebKit doesn't
// reliably honor. There, the overlay escaped its row and multiple rows'
// overlays ended up stacked on top of each other, so every click/tap in the
// table landed on whichever row's overlay happened to be topmost, regardless
// of which row was actually tapped. A real per-row click handler sidesteps
// the containing-block question entirely. The row should still contain a real
// <a href> for the primary link (keyboard nav, cmd/middle-click, no-JS).
export function ClickableRow({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter()
  return (
    <tr
      className={`cursor-pointer ${className ?? ''}`}
      onClick={() => router.push(href)}
    >
      {children}
    </tr>
  )
}
