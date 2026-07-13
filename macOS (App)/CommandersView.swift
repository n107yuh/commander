//
//  CommandersView.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData

struct CommandersView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Game.date, order: .reverse) private var games: [Game]
    @State private var renameTarget: MTGCommander?
    @State private var expandedID: String?

    private var entries: [CommanderEntry] {
        CommanderRecordsAggregator.entries(from: games)
    }

    private var topRemoteEntryIDs: Set<String> {
        topWinningEntryIDs(inPerson: false)
    }

    private var topInPersonEntryIDs: Set<String> {
        topWinningEntryIDs(inPerson: true)
    }

    private func topWinningEntryIDs(inPerson: Bool) -> Set<String> {
        var statsByEntry: [String: (wins: Int, games: Int)] = [:]
        for game in games where game.isInPerson == inPerson {
            for p in game.participants {
                guard !p.commanders.isEmpty else { continue }
                let key = p.commanders.sorted { $0.name < $1.name }
                    .map(\.name)
                    .joined(separator: " + ")
                var entry = statsByEntry[key] ?? (0, 0)
                entry.games += 1
                if p.didWin { entry.wins += 1 }
                statsByEntry[key] = entry
            }
        }
        let rates: [String: Double] = statsByEntry.compactMapValues { entry in
            entry.games > 0 ? Double(entry.wins) / Double(entry.games) : nil
        }
        guard let maxRate = rates.values.max(), maxRate > 0 else { return [] }
        return Set(rates.filter { $0.value == maxRate }.map { $0.key })
    }

    var body: some View {
        Group {
            if entries.isEmpty {
                ContentUnavailableView(
                    "No Commanders Yet",
                    systemImage: "crown",
                    description: Text("Commanders are added automatically when you log a game.")
                )
            } else {
                List {
                    ForEach(entries) { entry in
                        let expand = binding(for: entry)
                        DisclosureGroup(isExpanded: expand) {
                            CommanderDetailView(commanders: entry.commanders)
                                .padding(.top, 8)
                        } label: {
                            row(for: entry)
                                .contentShape(Rectangle())
                                .onTapGesture { expand.wrappedValue.toggle() }
                        }
                        .contextMenu {
                            ForEach(entry.commanders) { commander in
                                Button("Rename \(commander.name)…") {
                                    renameTarget = commander
                                }
                            }
                            Divider()
                            ForEach(entry.commanders) { commander in
                                Button("Delete \(commander.name)", role: .destructive) {
                                    context.delete(commander)
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Commander Records")
        .sheet(item: $renameTarget) { commander in
            RenameSheet(
                kind: .commander,
                originalName: commander.name,
                isNameTaken: { name in isCommanderNameTaken(name, excluding: commander) },
                onSave: { newName in commander.name = newName }
            )
        }
        .task { await PodStore.fetchMissingCardData(in: context) }
    }

    private func binding(for entry: CommanderEntry) -> Binding<Bool> {
        Binding(
            get: { expandedID == entry.id },
            set: { newValue in
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedID = newValue ? entry.id : nil
                }
            }
        )
    }

    private func row(for entry: CommanderEntry) -> some View {
        let streaks = entry.currentStreakBadges()
        return HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(entry.displayName).font(.title3.weight(.semibold))
                    if !streaks.isEmpty {
                        AchievementBadgeRow(achievements: streaks)
                    }
                    if let style = ChampionCrown.style(
                        isRemoteLeader: topRemoteEntryIDs.contains(entry.id),
                        isInPersonLeader: topInPersonEntryIDs.contains(entry.id)
                    ) {
                        ChampionCrown(style: style, font: .subheadline)
                            .help(crownTooltip(for: style))
                    }
                }
                HStack(spacing: 8) {
                    ColorIdentityBadge(colors: entry.colorIdentity, dotSize: 14)
                    Text("\(entry.games) games")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if entry.commanders.count > 1 {
                        Text("Partners")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.accentColor.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }
            }
            Spacer()
            Text("\(entry.wins)–\(entry.losses)")
                .font(.body)
                .monospacedDigit()
                .foregroundStyle(.secondary)
            Text(entry.winRate, format: .percent.precision(.fractionLength(0)))
                .font(.body)
                .monospacedDigit()
                .frame(width: 56, alignment: .trailing)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 5)
    }

    private func crownTooltip(for style: ChampionCrownStyle) -> String {
        switch style {
        case .blue: return "Best remote win rate"
        case .silver: return "Best in-person win rate"
        case .rainbow: return "Best win rate in both formats"
        }
    }

    private func isCommanderNameTaken(_ name: String, excluding: MTGCommander) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let all = try? context.fetch(FetchDescriptor<MTGCommander>()) else { return false }
        return all.contains { other in
            other.persistentModelID != excluding.persistentModelID &&
                other.name.caseInsensitiveCompare(trimmed) == .orderedSame
        }
    }
}
