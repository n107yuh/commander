//
//  PlayersView.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData

struct PlayerStats: Identifiable {
    let id: PersistentIdentifier
    let player: Player
    let wins: Int
    let losses: Int
    var games: Int { wins + losses }
    var winRate: Double { games == 0 ? 0 : Double(wins) / Double(games) }
}

struct PlayersView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Player.name) private var players: [Player]
    @Query(sort: \Game.date, order: .reverse) private var games: [Game]
    @State private var renameTarget: Player?
    @State private var expandedID: PersistentIdentifier?

    private var topRemoteWinnerIDs: Set<PersistentIdentifier> {
        topWinnerIDs(inPerson: false)
    }

    private var topInPersonWinnerIDs: Set<PersistentIdentifier> {
        topWinnerIDs(inPerson: true)
    }

    private func topWinnerIDs(inPerson: Bool) -> Set<PersistentIdentifier> {
        var statsByPlayer: [PersistentIdentifier: (wins: Int, games: Int)] = [:]
        for game in games where game.isInPerson == inPerson {
            for p in game.participants {
                guard let pl = p.player else { continue }
                var entry = statsByPlayer[pl.persistentModelID] ?? (0, 0)
                entry.games += 1
                if p.didWin { entry.wins += 1 }
                statsByPlayer[pl.persistentModelID] = entry
            }
        }
        let rates: [PersistentIdentifier: Double] = statsByPlayer.compactMapValues { entry in
            entry.games > 0 ? Double(entry.wins) / Double(entry.games) : nil
        }
        guard let maxRate = rates.values.max(), maxRate > 0 else { return [] }
        return Set(rates.filter { $0.value == maxRate }.map { $0.key })
    }

    private var sortedStats: [PlayerStats] {
        var dict: [PersistentIdentifier: (player: Player, wins: Int, losses: Int)] = [:]
        for player in players {
            dict[player.persistentModelID] = (player: player, wins: 0, losses: 0)
        }
        for game in games {
            for p in game.participants {
                guard let pl = p.player else { continue }
                let id = pl.persistentModelID
                var entry = dict[id] ?? (player: pl, wins: 0, losses: 0)
                if p.didWin { entry.wins += 1 } else { entry.losses += 1 }
                dict[id] = entry
            }
        }
        return dict.values
            .map { PlayerStats(id: $0.player.persistentModelID, player: $0.player, wins: $0.wins, losses: $0.losses) }
            .sorted { $0.player.name.localizedCaseInsensitiveCompare($1.player.name) == .orderedAscending }
    }

    var body: some View {
        Group {
            if sortedStats.isEmpty {
                ContentUnavailableView(
                    "No Players Yet",
                    systemImage: "person.2",
                    description: Text("Players are added automatically when you log a game.")
                )
            } else {
                List {
                    ForEach(sortedStats) { stat in
                        let expand = binding(for: stat.player)
                        DisclosureGroup(isExpanded: expand) {
                            PlayerDetailView(player: stat.player)
                                .padding(.top, 8)
                        } label: {
                            row(stats: stat)
                                .contentShape(Rectangle())
                                .onTapGesture { expand.wrappedValue.toggle() }
                        }
                        .contextMenu {
                            Button("Rename…") { renameTarget = stat.player }
                            Button("Delete", role: .destructive) {
                                context.delete(stat.player)
                                try? context.save()
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Player Records")
        .sheet(item: $renameTarget) { player in
            RenameSheet(
                kind: .player,
                originalName: player.name,
                isNameTaken: { name in isPlayerNameTaken(name, excluding: player) },
                onSave: { newName in
                    player.name = newName
                    try? context.save()
                }
            )
        }
    }

    private func binding(for player: Player) -> Binding<Bool> {
        Binding(
            get: { expandedID == player.persistentModelID },
            set: { newValue in
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedID = newValue ? player.persistentModelID : nil
                }
            }
        )
    }

    private func row(stats: PlayerStats) -> some View {
        let streaks = stats.player.currentStreakBadges()
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(stats.player.name).font(.title2.weight(.semibold))
                    if !streaks.isEmpty {
                        AchievementBadgeRow(achievements: streaks)
                    }
                    if let style = ChampionCrown.style(
                        isRemoteLeader: topRemoteWinnerIDs.contains(stats.player.persistentModelID),
                        isInPersonLeader: topInPersonWinnerIDs.contains(stats.player.persistentModelID)
                    ) {
                        ChampionCrown(style: style, font: .body)
                            .help(crownTooltip(for: style))
                    }
                }
                Text("\(stats.games) games")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(stats.wins)–\(stats.losses)")
                .font(.title3)
                .monospacedDigit()
                .foregroundStyle(.secondary)
            Text(stats.winRate, format: .percent.precision(.fractionLength(0)))
                .font(.title3)
                .monospacedDigit()
                .frame(width: 70, alignment: .trailing)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 10)
    }

    private func crownTooltip(for style: ChampionCrownStyle) -> String {
        switch style {
        case .blue: return "Best remote win rate"
        case .silver: return "Best in-person win rate"
        case .rainbow: return "Best win rate in both formats"
        }
    }

    private func isPlayerNameTaken(_ name: String, excluding: Player) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let all = try? context.fetch(FetchDescriptor<Player>()) else { return false }
        return all.contains { other in
            other.persistentModelID != excluding.persistentModelID &&
                other.name.caseInsensitiveCompare(trimmed) == .orderedSame
        }
    }
}
