// The distinct, more ornate crown used for the Ultimate Champion achievement (vs. the plain 👑
// emoji used for Digichampion/IRLchampion). Animates through the rainbow via the .champion-hue-cycle
// class defined in globals.css.
export function ChampionCrown({ size = 20, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <span className={`inline-flex text-amber-400 ${animated ? 'champion-hue-cycle' : ''}`}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M4,19 L4,14 L7,6 L9,12 L12,5 L15,12 L17,6 L20,14 L20,19 Z" />
        <circle cx="7" cy="6" r="1.3" />
        <circle cx="12" cy="5" r="1.4" />
        <circle cx="17" cy="6" r="1.3" />
      </svg>
    </span>
  )
}
