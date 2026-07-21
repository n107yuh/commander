//
//  GamesView.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData
import AVFoundation
import AppKit
import UniformTypeIdentifiers

struct GamesView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Game.date, order: .reverse) private var games: [Game]
    @State private var editingGame: Game?
    @State private var isCreating = false
    @StateObject private var konami = KonamiHandler()

    var body: some View {
        VStack(spacing: 0) {
            headerSection
                .padding(20)

            if games.count > 1 {
                Divider()
                historyList
            } else if games.isEmpty {
                emptyState
            } else {
                Spacer()
            }
        }
        .sheet(isPresented: $isCreating) {
            GameEditorView(mode: .create)
        }
        .sheet(item: $editingGame) { game in
            GameEditorView(mode: .edit(game))
        }
        .onAppear { konami.start() }
        .onDisappear { konami.stop() }
    }

    @ViewBuilder
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            championBanner

            if let recent = games.first {
                Text("Most Recent Game")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                RecentGameCard(game: recent)
                    .contentShape(Rectangle())
                    .onTapGesture { editingGame = recent }
            }

            Button {
                isCreating = true
            } label: {
                Label("Record Game", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .keyboardShortcut("n", modifiers: .command)
        }
    }

    private var digichampion: Player? {
        games.first(where: { $0.winner != nil && !$0.isInPerson })?.winner?.player
    }

    private var irlchampion: Player? {
        games.first(where: { $0.winner != nil && $0.isInPerson })?.winner?.player
    }

    private var ultimateChampion: Player? {
        guard let digi = digichampion, let irl = irlchampion,
              digi.persistentModelID == irl.persistentModelID else { return nil }
        return digi
    }

    @ViewBuilder
    private var championBanner: some View {
        let digi = digichampion
        let irl = irlchampion
        if digi != nil || irl != nil {
            VStack(spacing: 8) {
                if let ultimate = ultimateChampion {
                    VStack(spacing: 6) {
                        TimelineView(.animation(minimumInterval: 0.04)) { timeline in
                            let t = timeline.date.timeIntervalSince1970
                            let baseHue = (t / 2.5).truncatingRemainder(dividingBy: 1.0)
                            Image(systemName: "crown.fill")
                                .font(.largeTitle)
                                .foregroundStyle(
                                    AngularGradient(
                                        gradient: Gradient(colors: rainbowColors),
                                        center: .center,
                                        angle: .degrees(baseHue * 360)
                                    )
                                )
                        }
                        Text("Ultimate Champion")
                            .font(.caption.weight(.bold))
                            .textCase(.uppercase)
                            .foregroundStyle(.secondary)
                        rainbowName(ultimate.name)
                    }
                } else {
                    HStack(alignment: .top, spacing: 40) {
                        if let digi {
                            championRow(
                                crownColor: Color(red: 0.35, green: 0.55, blue: 0.95),
                                label: "Digichampion",
                                name: digi.name
                            )
                        }
                        if let irl {
                            championRow(
                                crownColor: Color(red: 0.78, green: 0.80, blue: 0.85),
                                label: "IRLchampion",
                                name: irl.name
                            )
                        }
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity)
            .background(Color.secondary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func championRow(crownColor: Color, label: String, name: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: "crown.fill")
                .font(.largeTitle)
                .foregroundStyle(crownColor)
            Text(label)
                .font(.caption.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(.secondary)
            Text(name)
                .font(.title2.weight(.semibold))
        }
    }

    private func rainbowName(_ name: String) -> some View {
        TimelineView(.animation(minimumInterval: 0.04)) { timeline in
            let t = timeline.date.timeIntervalSince1970
            let hue = (t / 2.5).truncatingRemainder(dividingBy: 1.0)
            Text(name)
                .font(.title2.bold())
                .foregroundStyle(Color(hue: hue, saturation: 0.85, brightness: 0.95))
        }
    }

    private var rainbowColors: [Color] {
        [.red, .orange, .yellow, .green, .blue, .indigo, .purple, .red]
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)
            Text("No games logged yet.")
                .foregroundStyle(.secondary)
            Spacer()
        }
    }

    private var historyList: some View {
        List {
            Section("Game History") {
                ForEach(games) { game in
                    NavigationLink {
                        GameDetailView(game: game)
                    } label: {
                        GameRow(game: game)
                    }
                    .contextMenu {
                        Button("Edit") { editingGame = game }
                        Button("Delete", role: .destructive) {
                            let players = game.participants.compactMap { $0.player }
                            context.delete(game)
                            PodStore.pruneOrphanedPlayers(players, in: context)
                        }
                    }
                }
                .onDelete(perform: deleteGames)
            }
        }
    }

    private func deleteGames(at offsets: IndexSet) {
        var players: [Player] = []
        for index in offsets {
            players.append(contentsOf: games[index].participants.compactMap { $0.player })
            context.delete(games[index])
        }
        PodStore.pruneOrphanedPlayers(players, in: context)
    }
}

private struct RecentGameCard: View {
    let game: Game

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(game.date, format: .dateTime.weekday(.wide).month().day().hour().minute())
                    .font(.headline)
                Spacer()
                Label(game.isInPerson ? "In Person" : "Remote",
                      systemImage: game.isInPerson ? "person.2.fill" : "wifi")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.accentColor.opacity(0.15))
                    .clipShape(Capsule())
            }

            if let winner = game.winner {
                HStack(spacing: 6) {
                    Image(systemName: "crown.fill")
                        .foregroundStyle(.yellow)
                    Text(winner.player?.name ?? "Unknown")
                        .font(.title3.bold())
                    Text("with")
                        .foregroundStyle(.secondary)
                    Text(winner.commanders.map(\.name).joined(separator: " + "))
                        .font(.title3.italic())
                }
            } else {
                Text("No winner recorded")
                    .foregroundStyle(.secondary)
            }

            let participants = game.participants.sorted { $0.placement < $1.placement }
            if !participants.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "person.2")
                    Text(participants.compactMap { p -> String? in
                        guard let name = p.player?.name else { return nil }
                        let cmdrs = p.commanders.map(\.name).joined(separator: " + ")
                        return cmdrs.isEmpty ? name : "\(name) (\(cmdrs))"
                    }.joined(separator: ", "))
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

            if !game.notes.isEmpty {
                Text(game.notes)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 2)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.secondary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct GameRow: View {
    let game: Game

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(game.date, format: .dateTime.month(.abbreviated).day().year())
                    .font(.headline)
                Text(participantSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            HStack(spacing: 8) {
                Image(systemName: game.isInPerson ? "person.2.fill" : "wifi")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let winner = game.winner {
                    HStack(spacing: 3) {
                        Image(systemName: "crown.fill")
                            .font(.caption)
                            .foregroundStyle(.yellow)
                        Text(winner.player?.name ?? "Unknown")
                            .font(.subheadline.weight(.medium))
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var participantSummary: String {
        let sorted = game.participants.sorted { $0.placement < $1.placement }
        let parts = sorted.compactMap { p -> String? in
            guard let name = p.player?.name else { return nil }
            let cmdrs = p.commanders.map(\.name).joined(separator: " + ")
            return cmdrs.isEmpty ? name : "\(name) (\(cmdrs))"
        }
        return parts.isEmpty ? "No players" : parts.joined(separator: ", ")
    }
}

// MARK: - Game Detail

struct GameDetailView: View {
    let game: Game

    var body: some View {
        ScrollView {
            AnnalsDetailPanel(game: game)
                .padding()
        }
        .navigationTitle(Text(game.date, format: .dateTime.weekday(.wide).month().day().year()))
    }
}

// MARK: - Editor

enum GameEditorMode {
    case create
    case edit(Game)
}

private struct ParticipantDraft: Identifiable {
    let id = UUID()
    var playerName: String = ""
    var commanderName: String = ""
    var partnerCommanderName: String = ""
    var hasPartner: Bool = false
    // 0-indexed starting turn order; -1 means not set
    var turnOrder: Int = -1
    // Opening hand size after mulligans; defaults to 7
    var openingHandSize: Int = 7
    // Per-game color identity for variable-identity commanders
    var chosenColorIdentity: [String] = []
}

struct GameEditorView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let mode: GameEditorMode

    private static let defaultGameDuration: TimeInterval = 90 * 60

    @State private var date: Date
    @State private var endTime: Date
    @State private var notes: String
    @State private var isInPerson: Bool?
    @State private var drafts: [ParticipantDraft]
    @State private var winnerID: UUID?
    @State private var showDeleteConfirm = false
    @State private var showFormatAlert = false

    init(mode: GameEditorMode) {
        self.mode = mode
        let duration = GameEditorView.defaultGameDuration

        if case .edit(let game) = mode {
            _date = State(initialValue: game.date)
            _endTime = State(initialValue: game.endTime ?? game.date.addingTimeInterval(duration))
            _notes = State(initialValue: game.notes)
            _isInPerson = State<Bool?>(initialValue: game.isInPerson)

            let sortedParticipants = game.participants.sorted { lhs, rhs in
                if lhs.placement != rhs.placement { return lhs.placement < rhs.placement }
                if lhs.didWin != rhs.didWin { return lhs.didWin && !rhs.didWin }
                return false
            }
            var loadedDrafts = sortedParticipants.map { p in
                ParticipantDraft(
                    playerName: p.player?.name ?? "",
                    commanderName: p.commander?.name ?? "",
                    partnerCommanderName: p.partnerCommander?.name ?? "",
                    hasPartner: p.partnerCommander != nil,
                    turnOrder: p.turnOrder,
                    openingHandSize: p.openingHandSize > 0 ? p.openingHandSize : 7,
                    chosenColorIdentity: p.chosenColorIdentity ?? []
                )
            }
            if loadedDrafts.isEmpty {
                loadedDrafts = [ParticipantDraft(), ParticipantDraft()]
            }
            _drafts = State(initialValue: loadedDrafts)
            _winnerID = State(initialValue: nil)
        } else {
            let now = Date.now
            _date = State(initialValue: now)
            _endTime = State(initialValue: now.addingTimeInterval(duration))
            _notes = State(initialValue: "")
            _isInPerson = State<Bool?>(initialValue: nil)
            _drafts = State(initialValue: [
                ParticipantDraft(), ParticipantDraft(), ParticipantDraft(), ParticipantDraft()
            ])
            _winnerID = State(initialValue: nil)
        }
    }

    private var isEditing: Bool {
        if case .edit = mode { return true } else { return false }
    }

    private var canSave: Bool {
        drafts.filter { !$0.playerName.trimmingCharacters(in: .whitespaces).isEmpty }.count >= 2
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(isEditing ? "Edit Game" : "New Game")
                    .font(.title2.bold())
                Spacer()
            }
            .padding()

            Divider()

            Form {
                Section("When") {
                    HStack(spacing: 16) {
                        DatePicker("Start", selection: Binding(
                            get: { date },
                            set: { newStart in
                                let delta = max(0, endTime.timeIntervalSince(date))
                                date = newStart
                                endTime = newStart.addingTimeInterval(delta)
                            }
                        ))
                        DatePicker("End", selection: $endTime, in: date...)
                    }
                    Picker("Format", selection: $isInPerson) {
                        Text("Played in person").tag(true as Bool?)
                        Text("Played digitally").tag(false as Bool?)
                    }
                    .pickerStyle(.radioGroup)
                }

                Section("Players") {
                    Text("Enter players in finish order — winner first, then the last person eliminated, and so on. The bottom row is the first player eliminated.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    let takenTurns: Set<Int> = Set(drafts.compactMap { $0.turnOrder >= 0 ? $0.turnOrder : nil })
                    ForEach(drafts.indices, id: \.self) { index in
                        ParticipantRow(
                            index: index,
                            total: drafts.count,
                            draft: $drafts[index],
                            takenTurnOrders: takenTurns,
                            onMoveUp: index > 0 ? { drafts.swapAt(index, index - 1) } : nil,
                            onMoveDown: index < drafts.count - 1 ? { drafts.swapAt(index, index + 1) } : nil,
                            onDelete: drafts.count > 2 ? { remove(drafts[index].id) } : nil,
                            playerSuggestions: playerSuggestions,
                            commanderSuggestions: commanderSuggestions
                        )
                    }
                    Button {
                        drafts.append(ParticipantDraft())
                    } label: {
                        Label("Add Player", systemImage: "plus.circle")
                    }
                }

                Section("Notable Moments") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
            }
            .formStyle(.grouped)

            Divider()

            HStack {
                if isEditing {
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete Game", systemImage: "trash")
                    }
                }
                Spacer()
                Button("Cancel", role: .cancel) { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button(isEditing ? "Save" : "Create") {
                    if isInPerson == nil {
                        showFormatAlert = true
                    } else {
                        save()
                    }
                }
                .keyboardShortcut(.defaultAction)
                .disabled(!canSave)
            }
            .padding()
        }
        .frame(minWidth: 600, minHeight: 660)
        .alert("Please select the format for this game", isPresented: $showFormatAlert) {
            Button("OK", role: .cancel) {}
        }
        .confirmationDialog(
            "Delete this game?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete Game", role: .destructive) {
                deleteGame()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove the game and its stats. This action can't be undone.")
        }
    }

    private func deleteGame() {
        if case .edit(let game) = mode {
            let players = game.participants.compactMap { $0.player }
            context.delete(game)
            PodStore.pruneOrphanedPlayers(players, in: context)
            dismiss()
        }
    }

    private func playerSuggestions(_ query: String) async -> [String] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }
        let descriptor = FetchDescriptor<Player>()
        guard let all = try? context.fetch(descriptor) else { return [] }
        return all
            .map(\.name)
            .filter { $0.localizedCaseInsensitiveContains(trimmed) }
            .sorted()
            .prefix(8)
            .map { String($0) }
    }

    private func commanderSuggestions(_ query: String) async -> [String] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        let descriptor = FetchDescriptor<MTGCommander>()
        let local = ((try? context.fetch(descriptor)) ?? [])
            .map(\.name)
            .filter { $0.localizedCaseInsensitiveContains(trimmed) }
            .sorted()

        let remote = await ScryfallService.autocomplete(query: trimmed)

        var seen = Set<String>()
        var result: [String] = []
        for name in local + remote {
            if seen.insert(name.lowercased()).inserted {
                result.append(name)
                if result.count >= 10 { break }
            }
        }
        return result
    }

    private func remove(_ id: UUID) {
        drafts.removeAll { $0.id == id }
        if winnerID == id { winnerID = nil }
    }

    private func save() {
        let resolvedEnd = max(endTime, date)

        // Phase 1: validate drafts and pre-resolve all Player/Commander entities.
        // We hold strong references in `resolved` so SwiftData can't lose them
        // during the delete-old-participants step.
        let validDrafts = drafts.filter {
            !$0.playerName.trimmingCharacters(in: .whitespaces).isEmpty
        }

        struct Resolved {
            let player: Player?
            let commander: MTGCommander?
            let partner: MTGCommander?
            let didWin: Bool
            let placement: Int
            let turnOrder: Int
            let openingHandSize: Int
            let chosenColorIdentity: [String]
        }

        var resolved: [Resolved] = []
        for (index, draft) in validDrafts.enumerated() {
            let trimmedName = draft.playerName.trimmingCharacters(in: .whitespaces)
            let player = PodStore.findOrCreatePlayer(named: trimmedName, in: context)
            let commander = PodStore.findOrCreateCommander(named: draft.commanderName, in: context)
            let partner: MTGCommander? = draft.hasPartner
                ? PodStore.findOrCreateCommander(named: draft.partnerCommanderName, in: context)
                : nil
            // Only persist a turn order that's still in range for the saved player count.
            let validTurn = (draft.turnOrder >= 0 && draft.turnOrder < validDrafts.count)
                ? draft.turnOrder
                : -1
            let isVariableMain = variableIdentityCommanderNames.contains(
                draft.commanderName.trimmingCharacters(in: .whitespaces).lowercased()
            )
            let isVariablePartner = draft.hasPartner && variableIdentityCommanderNames.contains(
                draft.partnerCommanderName.trimmingCharacters(in: .whitespaces).lowercased()
            )
            let chosenColors = (isVariableMain || isVariablePartner) ? draft.chosenColorIdentity : []
            resolved.append(Resolved(
                player: player,
                commander: commander,
                partner: partner,
                didWin: index == 0,
                placement: index,
                turnOrder: validTurn,
                openingHandSize: draft.openingHandSize,
                chosenColorIdentity: chosenColors
            ))
        }

        print("📝 Save — drafts: \(drafts.count), valid: \(validDrafts.count), resolved: \(resolved.count)")
        for (i, r) in resolved.enumerated() {
            print("  [\(i)] player: \(r.player?.name ?? "nil"), commander: \(r.commander?.name ?? "nil"), partner: \(r.partner?.name ?? "nil")")
        }

        let format = isInPerson ?? true

        // Phase 2: prepare the game and delete old participants.
        let game: Game
        var oldPlayers: [Player] = []
        switch mode {
        case .create:
            game = Game(date: date, endTime: resolvedEnd, notes: notes, isInPerson: format)
            context.insert(game)
        case .edit(let existing):
            existing.date = date
            existing.endTime = resolvedEnd
            existing.notes = notes
            existing.isInPerson = format
            let oldParticipants = existing.participants.map { $0 }
            oldPlayers = oldParticipants.compactMap { $0.player }
            print("📝 Edit — deleting \(oldParticipants.count) old participant(s)")
            for old in oldParticipants {
                context.delete(old)
            }
            game = existing
        }

        // Flush deletions and any modifications to disk before creating new
        // participants. This ensures SwiftData doesn't conflate the two phases.
        do {
            try context.save()
        } catch {
            print("⚠️ Phase 2 save failed: \(error)")
        }

        // Phase 3: create new participants linked to the pre-resolved entities.
        for r in resolved {
            let participant = GameParticipant(
                player: r.player,
                commander: r.commander,
                partnerCommander: r.partner,
                didWin: r.didWin,
                placement: r.placement,
                turnOrder: r.turnOrder,
                openingHandSize: r.openingHandSize,
                chosenColorIdentity: r.chosenColorIdentity.isEmpty ? nil : r.chosenColorIdentity
            )
            context.insert(participant)
            participant.game = game
        }

        do {
            try context.save()
        } catch {
            print("⚠️ Phase 3 save failed: \(error)")
        }

        // Clean up any player who was dropped from this game's roster (or
        // renamed away) and now has no games left at all.
        PodStore.pruneOrphanedPlayers(oldPlayers, in: context)

        print("📝 After save — game has \(game.participants.count) participant(s)")

        let ctx = context
        Task { await PodStore.fetchMissingCardData(in: ctx) }

        dismiss()
    }
}

private struct ParticipantRow: View {
    let index: Int
    let total: Int
    @Binding var draft: ParticipantDraft
    let takenTurnOrders: Set<Int>
    let onMoveUp: (() -> Void)?
    let onMoveDown: (() -> Void)?
    let onDelete: (() -> Void)?
    let playerSuggestions: (String) async -> [String]
    let commanderSuggestions: (String) async -> [String]

    private var placementLabel: String {
        switch index {
        case 0: return "Winner"
        case 1: return "2nd"
        case 2: return "3rd"
        default: return "\(index + 1)th"
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(spacing: 6) {
                VStack(spacing: 2) {
                    if index == 0 {
                        Image(systemName: "crown.fill")
                            .foregroundStyle(.yellow)
                            .font(.caption)
                    }
                    Text(placementLabel)
                        .font(.caption.weight(.bold))
                        .textCase(.uppercase)
                        .lineLimit(1)
                        .fixedSize()
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(index == 0 ? Color.yellow.opacity(0.18) : Color.secondary.opacity(0.15))
                .clipShape(Capsule())

                VStack(spacing: 2) {
                    Button {
                        onMoveUp?()
                    } label: {
                        Image(systemName: "chevron.up")
                    }
                    .buttonStyle(.plain)
                    .disabled(onMoveUp == nil)
                    .foregroundStyle(onMoveUp == nil ? Color.secondary.opacity(0.4) : Color.secondary)
                    .help("Move up")

                    Button {
                        onMoveDown?()
                    } label: {
                        Image(systemName: "chevron.down")
                    }
                    .buttonStyle(.plain)
                    .disabled(onMoveDown == nil)
                    .foregroundStyle(onMoveDown == nil ? Color.secondary.opacity(0.4) : Color.secondary)
                    .help("Move down")
                }
            }
            .frame(width: 72)

            VStack(spacing: 6) {
                HStack(spacing: 6) {
                    AutocompleteField(
                        title: "Player name",
                        text: $draft.playerName,
                        suggestionsProvider: playerSuggestions
                    )
                    turnOrderPicker
                    openingHandPicker
                }
                AutocompleteField(
                    title: "Commander",
                    text: $draft.commanderName,
                    suggestionsProvider: commanderSuggestions
                )

                if draft.hasPartner {
                    HStack(spacing: 6) {
                        AutocompleteField(
                            title: "Partner commander",
                            text: $draft.partnerCommanderName,
                            suggestionsProvider: commanderSuggestions
                        )
                        Button {
                            draft.hasPartner = false
                            draft.partnerCommanderName = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .help("Remove partner commander")
                    }
                } else {
                    HStack {
                        Button {
                            draft.hasPartner = true
                        } label: {
                            Label("Add Partner Commander", systemImage: "plus.circle")
                                .font(.caption)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(.tint)
                        Spacer()
                    }
                }

                if commanderNeedsColorChoice {
                    colorIdentityPicker
                }
            }

            if let onDelete {
                Button(role: .destructive, action: onDelete) {
                    Image(systemName: "minus.circle.fill")
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 2)
    }

    private var commanderNeedsColorChoice: Bool {
        let main = draft.commanderName.trimmingCharacters(in: .whitespaces).lowercased()
        let partner = draft.partnerCommanderName.trimmingCharacters(in: .whitespaces).lowercased()
        return variableIdentityCommanderNames.contains(main) ||
               (draft.hasPartner && variableIdentityCommanderNames.contains(partner))
    }

    private var colorIdentityPicker: some View {
        HStack(spacing: 6) {
            Text("Identity:")
                .font(.caption2)
                .foregroundStyle(.secondary)
            ForEach(["W", "U", "B", "R", "G", "C"], id: \.self) { color in
                let selected = draft.chosenColorIdentity.contains(color)
                Button {
                    if selected {
                        draft.chosenColorIdentity.removeAll { $0 == color }
                    } else {
                        draft.chosenColorIdentity.append(color)
                    }
                } label: {
                    Text(color)
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(selected ? (color == "W" ? Color.black : Color.white) : .secondary)
                        .frame(width: 20, height: 20)
                        .background(Circle().fill(selected ? mtgColor(color) : Color.secondary.opacity(0.12)))
                }
                .buttonStyle(.plain)
                .help(mtgColorName(color))
            }
        }
    }

    private func mtgColor(_ c: String) -> Color {
        switch c {
        case "W": return Color(white: 0.85)
        case "U": return Color(red: 0.13, green: 0.45, blue: 0.76)
        case "B": return Color(red: 0.20, green: 0.18, blue: 0.22)
        case "R": return Color(red: 0.82, green: 0.20, blue: 0.15)
        case "G": return Color(red: 0.18, green: 0.52, blue: 0.25)
        case "C": return Color(red: 0.65, green: 0.63, blue: 0.55)
        default:  return .gray
        }
    }

    private func mtgColorName(_ c: String) -> String {
        switch c {
        case "W": return "White"
        case "U": return "Blue"
        case "B": return "Black"
        case "R": return "Red"
        case "G": return "Green"
        case "C": return "Colorless"
        default:  return c
        }
    }

    private var turnOrderPicker: some View {
        Menu {
            Button("—") { draft.turnOrder = -1 }
            ForEach(0..<total, id: \.self) { i in
                Button(turnOrderLongLabel(i)) { draft.turnOrder = i }
                    .disabled(takenTurnOrders.contains(i) && draft.turnOrder != i)
            }
        } label: {
            HStack(spacing: 4) {
                Text(currentTurnLabel)
                    .font(.caption.weight(.medium))
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.secondary.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .frame(width: 130)
        .help("Starting turn order")
    }

    private var currentTurnLabel: String {
        draft.turnOrder >= 0 ? turnOrderLongLabel(draft.turnOrder) : "—"
    }

    private var openingHandPicker: some View {
        Menu {
            ForEach([7, 6, 5, 4, 3], id: \.self) { count in
                Button("\(count) cards") { draft.openingHandSize = count }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "rectangle.stack.fill")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                Text("\(draft.openingHandSize)")
                    .font(.caption.weight(.medium))
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.secondary.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .frame(width: 80)
        .help("Opening hand size after mulligans")
    }
}

// MARK: - Annals

struct AnnalsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Game.date, order: .reverse) private var games: [Game]
    @State private var expandedID: PersistentIdentifier?
    @State private var editingGame: Game?

    var body: some View {
        Group {
            if games.isEmpty {
                ContentUnavailableView(
                    "No Games Yet",
                    systemImage: "scroll",
                    description: Text("Games will appear here once you start recording them.")
                )
            } else {
                List {
                    ForEach(games) { game in
                        let expand = binding(for: game)
                        DisclosureGroup(isExpanded: expand) {
                            AnnalsDetailPanel(game: game)
                                .padding(.top, 4)
                        } label: {
                            AnnalsRow(game: game)
                                .contentShape(Rectangle())
                                .onTapGesture { expand.wrappedValue.toggle() }
                        }
                        .contextMenu {
                            Button("Edit Game") { editingGame = game }
                        }
                    }
                }
            }
        }
        .navigationTitle("The Annals")
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button {
                    exportCSV()
                } label: {
                    Label("Export CSV", systemImage: "tablecells")
                }
                .disabled(games.isEmpty)
                .help("Export game history as a CSV spreadsheet")
            }
        }
        .sheet(item: $editingGame) { game in
            GameEditorView(mode: .edit(game))
        }
    }

    private func exportCSV() {
        var rows: [[String]] = [[
            "Date", "End Time", "Duration (min)", "Format",
            "Placement", "Player", "Commander", "Partner Commander",
            "Turn Order", "Opening Hand", "Notes"
        ]]

        let iso = ISO8601DateFormatter()

        for game in games.sorted(by: { $0.date < $1.date }) {
            let dateStr = iso.string(from: game.date)
            let endStr = game.endTime.map { iso.string(from: $0) } ?? ""
            let durationMin: String = {
                guard let end = game.endTime, end > game.date else { return "" }
                return "\(Int(end.timeIntervalSince(game.date) / 60))"
            }()
            let format = game.isInPerson ? "In Person" : "Remote"
            let notes = game.notes.replacingOccurrences(of: "\n", with: " ")

            for p in game.participants.sorted(by: { $0.placement < $1.placement }) {
                let label: String
                switch p.placement {
                case 0: label = "1st"
                case 1: label = "2nd"
                case 2: label = "3rd"
                default: label = "\(p.placement + 1)th"
                }
                rows.append([
                    dateStr, endStr, durationMin, format,
                    label,
                    p.player?.name ?? "",
                    p.commander?.name ?? "",
                    p.partnerCommander?.name ?? "",
                    p.turnOrder >= 0 ? "\(p.turnOrder + 1)" : "",
                    p.openingHandSize > 0 ? "\(p.openingHandSize)" : "",
                    notes
                ])
            }
        }

        let csv = rows.map { row in
            row.map { "\"" + $0.replacingOccurrences(of: "\"", with: "\"\"") + "\"" }
               .joined(separator: ",")
        }.joined(separator: "\n")

        let panel = NSSavePanel()
        panel.allowedContentTypes = [.commaSeparatedText]
        panel.nameFieldStringValue = "Commander Games.csv"
        panel.title = "Export Game History"

        guard let window = NSApp.keyWindow else { return }
        panel.beginSheetModal(for: window) { response in
            guard response == .OK, let url = panel.url else { return }
            try? csv.write(to: url, atomically: true, encoding: .utf8)
        }
    }

    private func binding(for game: Game) -> Binding<Bool> {
        Binding(
            get: { expandedID == game.persistentModelID },
            set: { isExpanded in
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedID = isExpanded ? game.persistentModelID : nil
                }
            }
        )
    }
}

private struct AnnalsRow: View {
    let game: Game

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(game.date, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day().year().hour().minute())
                    .font(.headline)
                Spacer()
                Label(game.isInPerson ? "In Person" : "Remote",
                      systemImage: game.isInPerson ? "person.2.fill" : "wifi")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            if let winner = game.winner {
                HStack(spacing: 5) {
                    Image(systemName: "crown.fill")
                        .font(.caption)
                        .foregroundStyle(.yellow)
                    Text(winner.player?.name ?? "Unknown")
                        .font(.subheadline.weight(.semibold))
                    if !winner.commanders.isEmpty {
                        Text("with")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text(winner.commanders.map(\.name).joined(separator: " + "))
                            .font(.subheadline.italic())
                            .foregroundStyle(.secondary)
                    }
                }
            }
            let names = game.participants.compactMap { $0.player?.name }.sorted()
            if !names.isEmpty {
                Text(names.joined(separator: "  ·  "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 6)
    }
}

private struct AnnalsDetailPanel: View {
    let game: Game
    @Query(sort: \Game.date) private var allGames: [Game]

    private var contextBefore: AchievementContext {
        computeAchievementContext(from: allGames.filter { $0.date < game.date })
    }

    private var contextUpTo: AchievementContext {
        computeAchievementContext(from: allGames.filter { $0.date <= game.date })
    }

    private var sortedByPlacement: [GameParticipant] {
        game.participants.sorted { $0.placement < $1.placement }
    }

    private var sortedByTurn: [GameParticipant] {
        game.participants
            .filter { $0.turnOrder >= 0 }
            .sorted { $0.turnOrder < $1.turnOrder }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let end = game.endTime, end > game.date {
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("Game length:")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(formatGameDuration(end.timeIntervalSince(game.date)))
                        .font(.caption)
                }
            }

            Divider()

            VStack(alignment: .leading, spacing: 6) {
                sectionHeader("Finish Order")
                ForEach(Array(sortedByPlacement.enumerated()), id: \.offset) { i, p in
                    HStack(spacing: 10) {
                        Text(i == 0 ? "Winner" : placementLabel(i))
                            .font(.caption.weight(.bold))
                            .foregroundStyle(placementColor(i))
                            .frame(width: 48, alignment: .leading)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(p.player?.name ?? "—")
                                .font(.subheadline.weight(.medium))
                            if !p.commanders.isEmpty {
                                Text(p.commanders.map(\.name).joined(separator: " + "))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .italic()
                            }
                            if let player = p.player {
                                let participationsBefore = player.participations.filter {
                                    ($0.game?.date ?? .distantPast) < game.date
                                }
                                let participationsUpTo = player.participations.filter {
                                    ($0.game?.date ?? .distantPast) <= game.date
                                }
                                let idsBefore = Set(
                                    computeEarnedAchievements(from: participationsBefore, context: contextBefore, showPlayerAchievements: true).map(\.id)
                                )
                                let newlyEarned = computeEarnedAchievements(
                                    from: participationsUpTo,
                                    context: contextUpTo,
                                    showPlayerAchievements: true
                                ).filter { !idsBefore.contains($0.id) }
                                let perGame = perGameTriggeredAchievements(for: p)
                                let newlyEarnedIDs = Set(newlyEarned.map(\.id))
                                let toShow = newlyEarned + perGame.filter { !newlyEarnedIDs.contains($0.id) }
                                if !toShow.isEmpty {
                                    AchievementBadgeRow(achievements: toShow)
                                }
                            }
                        }
                    }
                }
            }

            if !sortedByTurn.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 6) {
                    sectionHeader("Turn Order")
                    HStack(spacing: 16) {
                        ForEach(Array(sortedByTurn.enumerated()), id: \.offset) { i, p in
                            HStack(spacing: 3) {
                                Text("\(i + 1).")
                                    .font(.caption2.monospacedDigit())
                                    .foregroundStyle(.secondary)
                                Text(p.player?.name ?? "—")
                                    .font(.caption.weight(.medium))
                            }
                        }
                    }
                }
            }

            if !game.notes.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 4) {
                    sectionHeader("Notable Moments")
                    Text(game.notes)
                        .font(.subheadline)
                }
            }
        }
        .padding(12)
        .background(Color.secondary.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
    }

    private func placementColor(_ index: Int) -> Color {
        switch index {
        case 0: return Color(red: 0.86, green: 0.70, blue: 0.11)
        case 1: return Color(red: 0.72, green: 0.73, blue: 0.78)
        case 2: return Color(red: 0.80, green: 0.49, blue: 0.20)
        default: return .secondary
        }
    }
}
