'use client'

import { useEffect, useState } from 'react'

export function CardImageZoom({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className ?? ''} cursor-zoom-in`}
        onMouseEnter={() => setVisible(true)}
        onClick={() => setVisible(true)}
      />
      {visible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setVisible(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl ring-1 ring-slate-700"
          />
        </div>
      )}
    </>
  )
}
