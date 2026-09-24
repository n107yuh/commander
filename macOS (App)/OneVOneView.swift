//
//  OneVOneView.swift
//  Commander (macOS)
//
//  1v1 games (exactly 2 participants) are tracked as their own separate universe of
//  stats, kept out of every other view's "main" pod stats — see Player/MTGCommander's
//  podParticipations/oneVOneParticipations in Models.swift. This view is the one place
//  those games' standings, head-to-head, and commander records are shown.
//

import SwiftUI
import SwiftData

private struct PlayerStats1v1: Identifiable {
    let id: PersistentIdentifier
    let player: Player
    let wins: Int
    let losses: Int
    var games: Int { wins + losses }
    var winRate: Double { games == 0 ? 0 : Double(wins) / Double(games) }
}

private struct Matchup: Identifiable {
    let id: PersistentIdentifier
    let playerA: Player
    let playerB: Player
    var winsA: Int = 0
    var winsB: Int = 0
    var total: Int { winsA + winsB }
}

struct OneVOneView: View {
    @Query(sort: \Player.name) private var players: [Player]
    @Query(sort: \Game.date, order: .reverse) private var games: [Game]

    private var oneVOneGames: [Game] {
        games.filter { $0.participants.count == 2 }
    }

    private var standings: [PlayerStats1v1] {
        var dict: [PersistentIdentifier: (player: Player, wins: Int, losses: Int)] = [:]
        for game in oneVOneGames {
            for p in game.participants {
                guard let pl = p.player else { continue }
                let id = pl.persistentModelID
                var entry = dict[id] ?? (player: pl, wins: 0, losses: 0)
                if p.didWin { entry.wins += 1 } else { entry.losses += 1 }
                dict[id] = entry
            }
        }
        return dict.values
            .map { PlayerStats1v1(id: $0.player.persistentModelID, player: $0.player, wins: $0.wins, losses: $0.losses) }
            .sorted { a, b in
                if a.winRate != b.winRate { return a.winRate > b.winRate }
                return a.wins > b.wins
            }
    }

    private var matchups: [Matchup] {
        var dict: [PersistentIdentifier: Matchup] = [:]
        for game in oneVOneGames {
            let parts = game.participants
            guard parts.count == 2,
                  let p0 = parts[0].player, let p1 = parts[1].player else { continue }
            let (first, second) = p0.name.localizedCaseInsensitiveCompare(p1.name) == .orderedAscending
                ? (parts[0], parts[1]) : (parts[1], parts[0])
            guard let playerA = first.player, let playerB = second.player else { continue }
            let key = playerA.persistentModelID
            var m = dict[key] ?? Matchup(id: key, playerA: playerA, playerB: playerB)
            if first.didWin { m.winsA += 1 }
            if second.didWin { m.winsB += 1 }
            dict[key] = m
        }
        return dict.values.sorted { $0.total > $1.total }
    }

    private var commanderEntries: [CommanderEntry] {
        CommanderRecordsAggregator.entries(from: oneVOneGames)
    }

    var body: some View {
        Group {
            if oneVOneGames.isEmpty {
                ContentUnavailableView(
                    "No 1v1 Games Yet",
                    systemImage: "person.2",
                    description: Text("A game with exactly 2 players will show up here, separate from the pod's main stats.")
                )
            } else {
                List {
                    Section("Standings") {
                        ForEach(standings) { stat in
                            standingsRow(stat)
                        }
                    }
                    Section("Head to Head") {
                        ForEach(matchups) { matchup in
                            matchupRow(matchup)
                        }
                    }
                    if !commanderEntries.isEmpty {
                        Section("Commander Records") {
                            ForEach(commanderEntries) { entry in
                                commanderRow(entry)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("1v1")
    }

    private func standingsRow(_ stat: PlayerStats1v1) -> some View {
        HStack {
            Text(stat.player.name).font(.headline)
            Spacer()
            Text("\(stat.wins)–\(stat.losses)")
                .monospacedDigit()
                .foregroundStyle(.secondary)
            Text(stat.winRate, format: .percent.precision(.fractionLength(0)))
                .monospacedDigit()
                .frame(width: 56, alignment: .trailing)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private func matchupRow(_ matchup: Matchup) -> some View {
        HStack {
            Text("\(matchup.playerA.name) vs \(matchup.playerB.name)").font(.subheadline)
            Spacer()
            Text("\(matchup.winsA)–\(matchup.winsB)")
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }

    private func commanderRow(_ entry: CommanderEntry) -> some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.displayName).font(.subheadline.weight(.medium))
                ColorIdentityBadge(colors: entry.colorIdentity, dotSize: 12)
            }
            Spacer()
            Text("\(entry.wins)–\(entry.losses)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
            Text(entry.winRate, format: .percent.precision(.fractionLength(0)))
                .font(.caption.monospacedDigit())
                .frame(width: 44, alignment: .trailing)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
