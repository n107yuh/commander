// Loss milestones escalate through a death motif instead of a tier color (unlike wins/games, which
// reuse the same trophy/medal shape tinted bronze/silver/gold/platinum).
export const LOSS_TIER_EMOJI: Record<string, string> = {
  'losses-5': '💀',
  'losses-10': '☠️',
  'losses-25': '⚰️',
  'losses-50': '⚱️',
}
