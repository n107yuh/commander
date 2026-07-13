//
//  PlayerDetailView.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData

struct PlayerDetailView: View {
    let player: Player
    @Query(sort: \Player.name) private var allPlayers: [Player]
    @Query(sort: \Game.date) private var allGames: [Game]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            recordBlock

            let bests = player.bestCommanders
            if !bests.isEmpty {
                Divider()
                bestCommanderBlock(bests)
            }

            if !player.placementCounts.isEmpty {
                Divider()
                placementsBlock
            }

            Divider()
            achievementsBlock

            Divider()
            headToHeadBlock
        }
        .padding(12)
        .background(Color.secondary.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var achievementsBlock: some View {
        let context = computeAchievementContext(from: allGames)
        let dates = achievementEarnedDates(for: player.participations, allGames: allGames)
        return VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Achievements")
            AchievementCatalogView(
                catalog: player.achievementCatalog(context: context),
                earnedDates: dates
            )
        }
    }

    private var recordBlock: some View {
        let format = player.formatBreakdown
        return VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Record")
            HStack(alignment: .top) {
                HStack(spacing: 24) {
                    statColumn("Wins", "\(player.wins)")
                    statColumn("Losses", "\(player.losses)")
                    statColumn("Games", "\(player.totalGames)")
                    statColumn("Win %", String(format: "%.0f%%", player.winRate * 100))
                    if let avg = player.averageGameDuration {
                        statColumn("Avg Length", formatGameDuration(avg))
                    }
                    if let hand = player.averageOpeningHand {
                        statColumn("Avg Hand", String(format: "%.1f", hand))
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    compactFormatRow(icon: "person.2.fill",
                                     wins: format.inPersonWins,
                                     losses: format.inPersonLosses,
                                     rate: format.inPersonWinRate)
                    compactFormatRow(icon: "wifi",
                                     wins: format.remoteWins,
                                     losses: format.remoteLosses,
                                     rate: format.remoteWinRate)
                }
            }
        }
    }

    private func compactFormatRow(icon: String, wins: Int, losses: Int, rate: Double) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text("\(wins)–\(losses)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
            Text(rate, format: .percent.precision(.fractionLength(0)))
                .font(.caption.monospacedDigit())
                .frame(width: 34, alignment: .trailing)
                .foregroundStyle(.secondary)
        }
    }

    private var placementsBlock: some View {
        let counts = player.placementCounts
        let countFor: (Int) -> Int = { p in counts.first { $0.placement == p }?.count ?? 0 }
        let first  = countFor(0)
        let second = countFor(1)
        let third  = countFor(2)
        let maxCount = max(first, second, third, 1)

        let extras = counts.filter { $0.placement > 2 }
        return VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Placements")
            HStack(alignment: .bottom, spacing: 16) {
                podiumBar(label: "2nd", count: second, maxCount: maxCount,
                          tint: Color(red: 0.72, green: 0.73, blue: 0.78),
                          tooltip: podiumTooltip(forPlacement: 1))
                podiumBar(label: "1st", count: first,  maxCount: maxCount,
                          tint: Color(red: 0.86, green: 0.70, blue: 0.11),
                          tooltip: podiumTooltip(forPlacement: 0))
                podiumBar(label: "3rd", count: third,  maxCount: maxCount,
                          tint: Color(red: 0.80, green: 0.49, blue: 0.20),
                          tooltip: podiumTooltip(forPlacement: 2))
                if !extras.isEmpty || player.averagePlacement != nil {
                    HStack(spacing: 16) {
                        ForEach(extras) { entry in
                            statColumn(placementLabel(entry.placement), "\(entry.count)")
                                .hoverTooltip(podiumTooltip(forPlacement: entry.placement))
                        }
                        if let avg = player.averagePlacement {
                            statColumn("Avg", String(format: "%.1f", avg))
                        }
                    }
                    .padding(.leading, 4)
                }
            }
        }
    }

    private func podiumBar(label: String, count: Int, maxCount: Int, tint: Color, tooltip: String = "") -> some View {
        let maxH: CGFloat = 64
        let minH: CGFloat = 10
        let height: CGFloat = count > 0
            ? max(minH, maxH * CGFloat(count) / CGFloat(maxCount))
            : minH
        return VStack(spacing: 3) {
            Text(count > 0 ? "\(count)" : "—")
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundStyle(count > 0 ? .primary : .secondary)
            RoundedRectangle(cornerRadius: 4)
                .fill(count > 0 ? tint : Color.secondary.opacity(0.12))
                .frame(width: 44, height: height)
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(.secondary)
        }
        .hoverTooltip(tooltip)
    }

    private func podiumTooltip(forPlacement placement: Int) -> String {
        let validParts = player.participations.filter { p in
            guard let game = p.game else { return false }
            return game.participants.contains { $0.placement > 0 }
        }
        let atPlacement = validParts.filter { $0.placement == placement && !$0.commanders.isEmpty }
        guard !atPlacement.isEmpty else { return "" }

        struct Entry { var colorTag: String; var count: Int }
        var groups: [String: Entry] = [:]
        let colorOrder = ["W", "U", "B", "R", "G"]
        for p in atPlacement {
            let sorted = p.commanders.sorted { $0.name < $1.name }
            let key    = sorted.map(\.name).joined(separator: " + ")
            let colorTag: String
            if sorted.allSatisfy({ $0.colorIdentity != nil }) {
                let merged = Set(sorted.compactMap(\.colorIdentity).flatMap { $0 })
                let ordered = colorOrder.filter { merged.contains($0) }
                colorTag = ordered.isEmpty ? "[Colorless]" : "[\(ordered.joined())]"
            } else {
                colorTag = groups[key]?.colorTag ?? ""
            }
            groups[key] = Entry(colorTag: colorTag, count: (groups[key]?.count ?? 0) + 1)
        }
        let lines = groups.sorted { $0.value.count > $1.value.count }.map { key, entry -> String in
            let suffix = entry.count > 1 ? " (×\(entry.count))" : ""
            let color  = entry.colorTag.isEmpty ? "" : " \(entry.colorTag)"
            return "\(key)\(color)\(suffix)"
        }
        return "\(placementLabel(placement)) Place Commander(s):\n" + lines.joined(separator: "\n")
    }

    private func bestCommanderBlock(_ entries: [CommanderEntry]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Best Commander")
            ForEach(entries) { entry in
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(entry.displayName).font(.headline)
                            ColorIdentityBadge(colors: entry.colorIdentity, dotSize: 10)
                        }
                        Text("\(entry.wins) wins in \(entry.games) games")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(entry.winRate, format: .percent.precision(.fractionLength(0)))
                        .font(.title3.bold().monospacedDigit())
                        .foregroundStyle(.green)
                }
            }
        }
    }

    private var headToHeadBlock: some View {
        let h2hs = player.allHeadToHeads(allPlayers: allPlayers)
        return VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Head-to-Head")
            if h2hs.isEmpty {
                Text(allPlayers.count <= 1
                     ? "Record games with other players to populate head-to-head."
                     : "No shared games with other players yet.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 8) {
                    ForEach(h2hs) { entry in
                        h2hRow(entry)
                    }
                }
            }
        }
    }

    private func h2hRow(_ entry: PlayerH2H) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(entry.opponent.name).font(.headline)
                Spacer()
                Text("\(entry.record.myWins)–\(entry.record.theirWins)")
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                Text(entry.winRateVsThem, format: .percent.precision(.fractionLength(0)))
                    .monospacedDigit()
                    .frame(width: 50, alignment: .trailing)
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 12) {
                Text("\(entry.record.total) games together")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let best = entry.bestVsThem, best.games > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "crown.fill")
                            .font(.caption2)
                            .foregroundStyle(.yellow)
                        Text("Best with \(best.displayName) (\(best.wins) of \(best.games))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            if entry.turnOrder.hasData {
                turnOrderLine(entry.turnOrder)
            }
        }
        .padding(8)
        .background(Color.secondary.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    @ViewBuilder
    private func turnOrderLine(_ turn: TurnOrderH2H) -> some View {
        HStack(spacing: 12) {
            if turn.comparedGames > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.right.circle")
                        .font(.caption2)
                    Text("Went first \(turn.iWentBefore) of \(turn.comparedGames)")
                }
            }
            if let mine = turn.myAvgTurn, let theirs = turn.theirAvgTurn {
                HStack(spacing: 4) {
                    Image(systemName: "die.face.4")
                        .font(.caption2)
                    Text("Avg turn: \(formatAvgTurn(mine)) vs \(formatAvgTurn(theirs))")
                }
            }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }

    private func formatAvgTurn(_ turn: Double) -> String {
        String(format: "%.1f", turn + 1)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
    }

    private func statColumn(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(.title3.bold().monospacedDigit())
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }

}


