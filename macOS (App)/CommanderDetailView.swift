//
//  CommanderDetailView.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData

struct CommanderDetailView: View {
    let commanders: [MTGCommander]
    @Query(sort: \MTGCommander.name) private var allCommanders: [MTGCommander]
    @Query(sort: \Game.date) private var allGames: [Game]

    private var commander: MTGCommander { commanders[0] }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 16) {
                cardImagesBlock
                colorIdentityBlock
                Spacer(minLength: 0)
            }
            Divider()
            recordBlock

            if !commander.placementCounts.isEmpty {
                Divider()
                placementsBlock
            }

            if !commander.turnOrderCounts.isEmpty {
                Divider()
                turnOrderBlock
            }

            let format = commander.formatBreakdown
            if format.inPersonGames + format.remoteGames > 0 {
                Divider()
                formatBlock(format)
            }

            let pilots = commander.topPilots
            if !pilots.isEmpty {
                Divider()
                pilotsBlock(pilots)
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

    private var comboParticipations: [GameParticipant] {
        let comboIDs = Set(commanders.map { $0.persistentModelID })
        return (commanders.first?.allParticipations ?? []).filter { p in
            Set(p.commanders.map { $0.persistentModelID }) == comboIDs
        }
    }

    private var achievementsBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Achievements")
            AchievementCatalogView(
                catalog: computeAchievementCatalog(
                    from: comboParticipations,
                    context: computeAchievementContext(from: allGames),
                    showPlayerAchievements: false
                )
            )
        }
    }

    private var cardImagesBlock: some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(allFaceURLs, id: \.self) { urlString in
                cardImage(url: urlString)
            }
            if allFaceURLs.isEmpty {
                ForEach(commanders) { c in
                    placeholder(label: c.name, system: "rectangle.portrait.on.rectangle.portrait")
                }
            }
        }
    }

    private var allFaceURLs: [String] {
        commanders.flatMap { $0.imageURLs ?? [] }
    }

    private var cardWidth: CGFloat {
        allFaceURLs.count > 2 ? 150 : 200
    }

    @ViewBuilder
    private func cardImage(url urlString: String) -> some View {
        if let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                        .frame(width: cardWidth, height: cardWidth / 0.72)
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                case .failure:
                    placeholder(label: "Image failed", system: "exclamationmark.triangle")
                @unknown default:
                    placeholder(label: "", system: "questionmark.square")
                }
            }
            .frame(maxWidth: cardWidth)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .shadow(color: .black.opacity(0.25), radius: 4, x: 0, y: 2)
        }
    }

    private func placeholder(label: String, system: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: system)
                .font(.title2)
                .foregroundStyle(.secondary)
            Text(label)
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(width: cardWidth, height: cardWidth / 0.72)
        .background(Color.secondary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var colorIdentityBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader("Color Identity")
            VStack(alignment: .leading, spacing: 8) {
                ColorIdentityBadge(colors: combinedColorIdentity, dotSize: 22)
                if let colors = combinedColorIdentity, !colors.isEmpty {
                    Text(colors.joined(separator: " "))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }
        }
    }

    private var combinedColorIdentity: [String]? {
        let hasVariable = commanders.contains {
            variableIdentityCommanderNames.contains($0.name.lowercased())
        }
        if hasVariable {
            let fixedColors = commanders
                .filter { !variableIdentityCommanderNames.contains($0.name.lowercased()) }
                .compactMap(\.colorIdentity)
                .flatMap { $0 }
            var chosenSet = Set<String>()
            for p in comboParticipations {
                if let chosen = p.chosenColorIdentity { chosenSet.formUnion(chosen) }
            }
            let merged = Set(fixedColors).union(chosenSet)
            if merged.isEmpty && fixedColors.isEmpty { return nil }
            let ordering = ["W", "U", "B", "R", "G"]
            return ordering.filter { merged.contains($0) }
        }
        if commanders.allSatisfy({ $0.colorIdentity == nil }) { return nil }
        let merged = Set(commanders.compactMap(\.colorIdentity).flatMap { $0 })
        let ordering = ["W", "U", "B", "R", "G"]
        return ordering.filter { merged.contains($0) }
    }

    private var recordBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Record")
            HStack(spacing: 24) {
                statColumn("Wins", "\(commander.wins)")
                statColumn("Losses", "\(commander.losses)")
                statColumn("Games", "\(commander.totalGames)")
                statColumn("Win %", String(format: "%.0f%%", commander.winRate * 100))
                if let avg = commander.averageGameDuration {
                    statColumn("Avg Length", formatGameDuration(avg))
                }
                if let hand = commander.averageOpeningHand {
                    statColumn("Avg Hand", String(format: "%.1f", hand))
                }
            }
        }
    }

    private var placementsBlock: some View {
        let counts = commander.placementCounts
        let countFor: (Int) -> Int = { p in counts.first { $0.placement == p }?.count ?? 0 }
        let first   = countFor(0)
        let second  = countFor(1)
        let third   = countFor(2)
        let maxCount = max(first, second, third, 1)
        let extras  = counts.filter { $0.placement > 2 }

        return VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Placements")
            HStack(alignment: .bottom, spacing: 16) {
                podiumBar(label: "2nd", count: second, maxCount: maxCount,
                          tint: Color(red: 0.72, green: 0.73, blue: 0.78),
                          tooltip: commanderPlacementTooltip(forPlacement: 1))
                podiumBar(label: "1st", count: first,  maxCount: maxCount,
                          tint: Color(red: 0.86, green: 0.70, blue: 0.11),
                          tooltip: commanderPlacementTooltip(forPlacement: 0))
                podiumBar(label: "3rd", count: third,  maxCount: maxCount,
                          tint: Color(red: 0.80, green: 0.49, blue: 0.20),
                          tooltip: commanderPlacementTooltip(forPlacement: 2))
                if !extras.isEmpty || commander.averagePlacement != nil {
                    HStack(spacing: 16) {
                        ForEach(extras) { entry in
                            statColumn(placementLabel(entry.placement), "\(entry.count)")
                                .hoverTooltip(commanderPlacementTooltip(forPlacement: entry.placement))
                        }
                        if let avg = commander.averagePlacement {
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

    private func commanderPlacementTooltip(forPlacement placement: Int) -> String {
        let atPlacement = comboParticipations.filter { $0.placement == placement }
        guard !atPlacement.isEmpty else { return "" }
        var groups: [String: Int] = [:]
        for p in atPlacement {
            guard let pl = p.player else { continue }
            groups[pl.name, default: 0] += 1
        }
        let lines = groups.sorted { $0.value > $1.value }.map { name, count -> String in
            count > 1 ? "\(name) (×\(count))" : name
        }
        return "\(placementLabel(placement)) Place Pilot(s):\n" + lines.joined(separator: "\n")
    }

    private var turnOrderBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Turn Order")
            HStack(spacing: 24) {
                ForEach(commander.turnOrderCounts) { entry in
                    statColumn(
                        placementLabel(entry.turnOrder),
                        "\(entry.wins)–\(entry.count - entry.wins)"
                    )
                }
                if let avg = commander.averageTurnOrder {
                    statColumn("Avg", String(format: "%.1f", avg))
                }
            }
            Text("Wins–losses by starting turn.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    private func formatBlock(_ format: FormatBreakdown) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionHeader("Format")
            formatRow(label: "In Person", icon: "person.2.fill",
                      wins: format.inPersonWins, losses: format.inPersonLosses,
                      rate: format.inPersonWinRate)
            formatRow(label: "Remote", icon: "wifi",
                      wins: format.remoteWins, losses: format.remoteLosses,
                      rate: format.remoteWinRate)
        }
    }

    private func pilotsBlock(_ pilots: [CommanderPilotEntry]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionHeader("Pilots")
            ForEach(pilots) { entry in
                HStack {
                    Text(entry.player.name)
                    Spacer()
                    Text("\(entry.wins)–\(entry.losses)")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                    Text(entry.winRate, format: .percent.precision(.fractionLength(0)))
                        .monospacedDigit()
                        .frame(width: 50, alignment: .trailing)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var headToHeadBlock: some View {
        let h2hs = commander.allHeadToHeads(allCommanders: allCommanders)
        return VStack(alignment: .leading, spacing: 8) {
            sectionHeader("Head-to-Head")
            if h2hs.isEmpty {
                Text("No shared games with other commanders yet.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 6) {
                    ForEach(h2hs) { entry in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(entry.opponent.name)
                                Spacer()
                                Text("\(entry.record.myWins)W")
                                    .monospacedDigit()
                                    .foregroundStyle(.green)
                                Text("\(entry.record.theirWins)L")
                                    .monospacedDigit()
                                    .foregroundStyle(.red)
                                Text("(\(entry.record.total) games)")
                                    .monospacedDigit()
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            if entry.turnOrder.hasData {
                                turnOrderLine(entry.turnOrder)
                            }
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func turnOrderLine(_ turn: TurnOrderH2H) -> some View {
        HStack(spacing: 12) {
            if turn.comparedGames > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.right.circle").font(.caption2)
                    Text("Went first \(turn.iWentBefore) of \(turn.comparedGames)")
                }
            }
            if let mine = turn.myAvgTurn, let theirs = turn.theirAvgTurn {
                HStack(spacing: 4) {
                    Image(systemName: "die.face.4").font(.caption2)
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

    private func formatRow(label: String, icon: String, wins: Int, losses: Int, rate: Double) -> some View {
        HStack {
            Label(label, systemImage: icon)
                .font(.subheadline)
            Spacer()
            Text("\(wins)–\(losses)").monospacedDigit().foregroundStyle(.secondary)
            Text(rate, format: .percent.precision(.fractionLength(0)))
                .monospacedDigit()
                .frame(width: 50, alignment: .trailing)
                .foregroundStyle(.secondary)
        }
    }
}
