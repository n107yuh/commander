import { loadData } from '@/lib/data'
import { GameLogForm } from '@/components/GameLogForm'

export default function LogGamePage() {
  const { players, commanders } = loadData()
  const knownPlayers = players.map(p => p.name).sort()
  const knownCommanders = commanders.map(c => c.name).sort()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Log a Game</h1>
        <p className="text-slate-400 text-sm mt-1">
          Use this when Noah isn&apos;t around to log games directly. Fill this out after each game — you can queue
          up several before exporting. When you&apos;re done for the night, export and send the downloaded file to
          Noah to add to the real record.
        </p>
      </div>
      <GameLogForm knownPlayers={knownPlayers} knownCommanders={knownCommanders} />
    </div>
  )
}
