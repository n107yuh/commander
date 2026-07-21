//
//  Models.swift
//  Commander (macOS)
//

import Foundation
import SwiftData

// Commanders whose color identity is chosen by the player before each game.
let variableIdentityCommanderNames: Set<String> = [
    "the prismatic piper",
    "faceless one",
    "clara oswald"
]

@Model
final class Player {
    @Attribute(.unique) var name: String

    @Relationship(deleteRule: .nullify, inverse: \GameParticipant.player)
    var participations: [GameParticipant] = []

    init(name: String) {
        self.name = name
    }

    var wins: Int { participations.filter { $0.didWin }.count }
    var losses: Int { participations.filter { !$0.didWin }.count }
    var totalGames: Int { participations.count }
    var winRate: Double {
        totalGames == 0 ? 0 : Double(wins) / Double(totalGames)
    }
}

@Model
final class MTGCommander {
    @Attribute(.unique) var name: String
    var colorIdentity: [String]?
    var imageURLs: [String]?

    @Relationship(deleteRule: .nullify, inverse: \GameParticipant.commander)
    var participations: [GameParticipant] = []

    @Relationship(deleteRule: .nullify, inverse: \GameParticipant.partnerCommander)
    var partnerParticipations: [GameParticipant] = []

    init(name: String, colorIdentity: [String]? = nil, imageURLs: [String]? = nil) {
        self.name = name
        self.colorIdentity = colorIdentity
        self.imageURLs = imageURLs
    }

    var allParticipations: [GameParticipant] {
        participations + partnerParticipations
    }

    var wins: Int { allParticipations.filter { $0.didWin }.count }
    var losses: Int { allParticipations.filter { !$0.didWin }.count }
    var totalGames: Int { allParticipations.count }
    var winRate: Double {
        totalGames == 0 ? 0 : Double(wins) / Double(totalGames)
    }
}

@Model
final class Game {
    var date: Date
    var endTime: Date?
    var notes: String
    var isInPerson: Bool = true

    @Relationship(deleteRule: .cascade, inverse: \GameParticipant.game)
    var participants: [GameParticipant] = []

    init(date: Date = .now, endTime: Date? = nil, notes: String = "", isInPerson: Bool = true) {
        self.date = date
        self.endTime = endTime
        self.notes = notes
        self.isInPerson = isInPerson
    }

    var winner: GameParticipant? {
        participants.first { $0.didWin }
    }

    func containsCommander(_ commander: MTGCommander) -> Bool {
        let id = commander.persistentModelID
        return participants.contains { p in
            p.commander?.persistentModelID == id ||
            p.partnerCommander?.persistentModelID == id
        }
    }

    func participant(withCommander commander: MTGCommander) -> GameParticipant? {
        let id = commander.persistentModelID
        return participants.first { p in
            p.commander?.persistentModelID == id ||
            p.partnerCommander?.persistentModelID == id
        }
    }
}

@Model
final class GameParticipant {
    var player: Player?
    var commander: MTGCommander?
    var partnerCommander: MTGCommander?
    var game: Game?
    var didWin: Bool
    var placement: Int = 0
    // 0-indexed starting turn order; -1 means not recorded for this participant.
    var turnOrder: Int = -1
    // Cards in the opening hand after mulligans. 7 = no mulligan.
    var openingHandSize: Int = 7
    // Per-game color identity override for commanders with variable identity (e.g. Prismatic Piper).
    var chosenColorIdentity: [String]?

    init(
        player: Player? = nil,
        commander: MTGCommander? = nil,
        partnerCommander: MTGCommander? = nil,
        didWin: Bool = false,
        placement: Int = 0,
        turnOrder: Int = -1,
        openingHandSize: Int = 7,
        chosenColorIdentity: [String]? = nil
    ) {
        self.player = player
        self.commander = commander
        self.partnerCommander = partnerCommander
        self.didWin = didWin
        self.placement = placement
        self.turnOrder = turnOrder
        self.openingHandSize = openingHandSize
        self.chosenColorIdentity = chosenColorIdentity
    }

    var commanders: [MTGCommander] {
        [commander, partnerCommander].compactMap { $0 }
    }
}

enum PodStore {
    static func findOrCreatePlayer(named rawName: String, in context: ModelContext) -> Player? {
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }
        if let all = try? context.fetch(FetchDescriptor<Player>()),
           let existing = all.first(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) {
            return existing
        }
        let new = Player(name: name)
        context.insert(new)
        return new
    }

    /// Deletes any of the given players left with zero recorded games — e.g. a
    /// player only created for a since-deleted test game. Call after removing
    /// a game or editing a roster, passing the players who were on it before
    /// the change; anyone still at 0-0 afterward gets cleaned up automatically.
    static func pruneOrphanedPlayers(_ players: [Player], in context: ModelContext) {
        try? context.save()
        var seen = Set<PersistentIdentifier>()
        for player in players {
            guard seen.insert(player.persistentModelID).inserted else { continue }
            if player.participations.isEmpty {
                context.delete(player)
            }
        }
    }

    static func findOrCreateCommander(named rawName: String, in context: ModelContext) -> MTGCommander? {
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }
        if let all = try? context.fetch(FetchDescriptor<MTGCommander>()),
           let existing = all.first(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) {
            return existing
        }
        let new = MTGCommander(name: name)
        context.insert(new)
        return new
    }

    // SwiftData lightweight migration filled the added `turnOrder` column with 0
    // (Int's zero value) instead of the Swift default of -1, making every legacy
    // participant look like "Went First". A genuine game can have at most one
    // participant on turn 0, so any game where every participant is at 0 is
    // migration noise — reset those to -1 ("not set").
    static func backfillLegacyTurnOrders(in context: ModelContext) {
        guard let games = try? context.fetch(FetchDescriptor<Game>()) else { return }
        var didMutate = false
        for game in games {
            guard !game.participants.isEmpty else { continue }
            let allZero = game.participants.allSatisfy { $0.turnOrder == 0 }
            if allZero {
                for p in game.participants {
                    p.turnOrder = -1
                }
                didMutate = true
            }
        }
        if didMutate {
            try? context.save()
        }
    }

    // SwiftData lightweight migration fills new `openingHandSize` with 0,
    // but the real-world default is 7 (no mulligan). Backfill any zero values.
    static func backfillLegacyOpeningHands(in context: ModelContext) {
        guard let parts = try? context.fetch(FetchDescriptor<GameParticipant>()) else { return }
        var didMutate = false
        for p in parts where p.openingHandSize <= 0 {
            p.openingHandSize = 7
            didMutate = true
        }
        if didMutate {
            try? context.save()
        }
    }

    static func fetchMissingCardData(in context: ModelContext) async {
        let descriptor = FetchDescriptor<MTGCommander>()
        guard let all = try? context.fetch(descriptor) else { return }
        for commander in all where commander.colorIdentity == nil
            || commander.imageURLs == nil
            || commander.imageURLs?.isEmpty == true {
            guard let info = await ScryfallService.fetchCard(named: commander.name) else { continue }
            if commander.colorIdentity == nil {
                commander.colorIdentity = info.colorIdentity
            }
            if commander.imageURLs == nil || commander.imageURLs?.isEmpty == true {
                commander.imageURLs = info.imageURLs
            }
        }
    }
}
