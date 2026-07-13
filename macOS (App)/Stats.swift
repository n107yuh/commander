//
//  Stats.swift
//  Commander (macOS)
//

import Foundation
import SwiftData

struct H2HRecord {
    var myWins: Int = 0
    var theirWins: Int = 0
    var otherWins: Int = 0
    var total: Int { myWins + theirWins + otherWins }
}

struct CommanderEntry: Identifiable {
    let id: String
    let commanders: [MTGCommander]
    let wins: Int
    let games: Int
    // All participations for this commander combo, used to resolve per-game chosen identities.
    var participations: [GameParticipant] = []

    var losses: Int { games - wins }
    var winRate: Double { games == 0 ? 0 : Double(wins) / Double(games) }
    var displayName: String { commanders.map(\.name).joined(separator: " + ") }

    var colorIdentity: [String]? {
        // If any variable-identity commander is in this combo, derive the most common
        // chosen identity from participations and merge with fixed commanders' colors.
        let hasVariable = commanders.contains {
            variableIdentityCommanderNames.contains($0.name.lowercased())
        }
        if hasVariable {
            let fixedColors = commanders
                .filter { !variableIdentityCommanderNames.contains($0.name.lowercased()) }
                .compactMap(\.colorIdentity)
                .flatMap { $0 }
            // Collect all chosen colors seen across participations.
            var chosenSet = Set<String>()
            for p in participations {
                if let chosen = p.chosenColorIdentity {
                    chosenSet.formUnion(chosen)
                }
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
}

struct PlayerH2H: Identifiable {
    let id: PersistentIdentifier
    let opponent: Player
    let record: H2HRecord
    let bestVsThem: CommanderEntry?
    let turnOrder: TurnOrderH2H

    var winRateVsThem: Double {
        record.total == 0 ? 0 : Double(record.myWins) / Double(record.total)
    }
}

struct TurnOrderH2H {
    var iWentBefore: Int = 0
    var theyWentBefore: Int = 0
    var myAvgTurn: Double?
    var theirAvgTurn: Double?

    var comparedGames: Int { iWentBefore + theyWentBefore }
    var hasData: Bool { comparedGames > 0 || myAvgTurn != nil || theirAvgTurn != nil }
}

struct CommanderH2H: Identifiable {
    let id: PersistentIdentifier
    let opponent: MTGCommander
    let record: H2HRecord
    let turnOrder: TurnOrderH2H
}

struct CommanderPilotEntry: Identifiable {
    let id: PersistentIdentifier
    let player: Player
    let wins: Int
    let games: Int
    var losses: Int { games - wins }
    var winRate: Double { games == 0 ? 0 : Double(wins) / Double(games) }
}

struct PlacementCount: Identifiable {
    let placement: Int
    let count: Int
    var id: Int { placement }
}

struct TurnOrderCount: Identifiable {
    let turnOrder: Int
    let count: Int
    let wins: Int
    var id: Int { turnOrder }
}

func placementLabel(_ placement: Int) -> String {
    switch placement {
    case 0: return "1st"
    case 1: return "2nd"
    case 2: return "3rd"
    default: return "\(placement + 1)th"
    }
}

func turnOrderLongLabel(_ turn: Int) -> String {
    switch turn {
    case 0: return "Went First"
    case 1: return "Went Second"
    case 2: return "Went Third"
    case 3: return "Went Fourth"
    case 4: return "Went Fifth"
    case 5: return "Went Sixth"
    case 6: return "Went Seventh"
    case 7: return "Went Eighth"
    default: return "Went \(placementLabel(turn))"
    }
}

private func participationsWithPlacement(_ participations: [GameParticipant]) -> [GameParticipant] {
    participations.filter { p in
        guard let game = p.game else { return false }
        return game.participants.contains { $0.placement > 0 }
    }
}

private func Stats_placementCounts(_ participations: [GameParticipant]) -> [PlacementCount] {
    let valid = participationsWithPlacement(participations)
    var counts: [Int: Int] = [:]
    for p in valid {
        counts[p.placement, default: 0] += 1
    }
    return counts
        .map { PlacementCount(placement: $0.key, count: $0.value) }
        .sorted { $0.placement < $1.placement }
}

private func Stats_averagePlacement(_ participations: [GameParticipant]) -> Double? {
    let valid = participationsWithPlacement(participations)
    guard !valid.isEmpty else { return nil }
    let sum = valid.reduce(0) { $0 + $1.placement + 1 }
    return Double(sum) / Double(valid.count)
}

struct FormatBreakdown {
    var inPersonWins: Int = 0
    var inPersonLosses: Int = 0
    var remoteWins: Int = 0
    var remoteLosses: Int = 0

    var inPersonGames: Int { inPersonWins + inPersonLosses }
    var remoteGames: Int { remoteWins + remoteLosses }

    var inPersonWinRate: Double {
        inPersonGames == 0 ? 0 : Double(inPersonWins) / Double(inPersonGames)
    }
    var remoteWinRate: Double {
        remoteGames == 0 ? 0 : Double(remoteWins) / Double(remoteGames)
    }
}

private func computeAverageOpeningHand(_ participations: [GameParticipant]) -> Double? {
    let sizes = participations.compactMap { p -> Int? in
        p.openingHandSize > 0 ? p.openingHandSize : nil
    }
    guard !sizes.isEmpty else { return nil }
    return Double(sizes.reduce(0, +)) / Double(sizes.count)
}

private func averageDuration(_ participations: [GameParticipant]) -> TimeInterval? {
    let durations: [TimeInterval] = participations.compactMap { p in
        guard let game = p.game,
              let end = game.endTime,
              end > game.date else { return nil }
        return end.timeIntervalSince(game.date)
    }
    guard !durations.isEmpty else { return nil }
    return durations.reduce(0, +) / Double(durations.count)
}

func formatGameDuration(_ seconds: TimeInterval) -> String {
    let totalMinutes = max(0, Int(seconds.rounded() / 60))
    let hours = totalMinutes / 60
    let minutes = totalMinutes % 60
    if hours > 0 { return "\(hours)h \(minutes)m" }
    return "\(minutes)m"
}

private func breakdown(_ participations: [GameParticipant]) -> FormatBreakdown {
    var f = FormatBreakdown()
    for p in participations {
        guard let game = p.game else { continue }
        if game.isInPerson {
            if p.didWin { f.inPersonWins += 1 } else { f.inPersonLosses += 1 }
        } else {
            if p.didWin { f.remoteWins += 1 } else { f.remoteLosses += 1 }
        }
    }
    return f
}

private func bestEntry(
    from participations: [GameParticipant],
    filter: (Game) -> Bool = { _ in true }
) -> CommanderEntry? {
    var dict: [String: (commanders: [MTGCommander], wins: Int, games: Int, parts: [GameParticipant])] = [:]
    for p in participations {
        guard let game = p.game, filter(game) else { continue }
        guard !p.commanders.isEmpty else { continue }
        let sorted = p.commanders.sorted { $0.name < $1.name }
        let key = sorted.map(\.name).joined(separator: " + ")
        var entry = dict[key] ?? (commanders: sorted, wins: 0, games: 0, parts: [])
        entry.games += 1
        entry.parts.append(p)
        if p.didWin { entry.wins += 1 }
        dict[key] = entry
    }
    guard let best = dict.values.max(by: { lhs, rhs in
        if lhs.wins != rhs.wins { return lhs.wins < rhs.wins }
        return lhs.games < rhs.games
    }) else { return nil }
    return CommanderEntry(id: best.commanders.map(\.name).joined(separator: " + "),
                          commanders: best.commanders,
                          wins: best.wins,
                          games: best.games,
                          participations: best.parts)
}

private func bestEntries(from participations: [GameParticipant]) -> [CommanderEntry] {
    var dict: [String: (commanders: [MTGCommander], wins: Int, games: Int, parts: [GameParticipant])] = [:]
    for p in participations {
        guard let _ = p.game else { continue }
        guard !p.commanders.isEmpty else { continue }
        let sorted = p.commanders.sorted { $0.name < $1.name }
        let key = sorted.map(\.name).joined(separator: " + ")
        var entry = dict[key] ?? (commanders: sorted, wins: 0, games: 0, parts: [])
        entry.games += 1
        entry.parts.append(p)
        if p.didWin { entry.wins += 1 }
        dict[key] = entry
    }
    let all = dict.values
        .map { CommanderEntry(id: $0.commanders.map(\.name).joined(separator: " + "),
                              commanders: $0.commanders, wins: $0.wins, games: $0.games,
                              participations: $0.parts) }
        .filter { $0.wins > 0 }
    guard let bestRate = all.map(\.winRate).max() else { return [] }
    return all
        .filter { abs($0.winRate - bestRate) < 0.0001 }
        .sorted { lhs, rhs in
            if lhs.wins != rhs.wins { return lhs.wins > rhs.wins }
            return lhs.displayName < rhs.displayName
        }
}

extension Player {
    var formatBreakdown: FormatBreakdown { breakdown(participations) }

    var bestCommander: CommanderEntry? { bestEntry(from: participations) }

    var bestCommanders: [CommanderEntry] { bestEntries(from: participations) }

    var averageGameDuration: TimeInterval? { averageDuration(participations) }

    var averageOpeningHand: Double? { computeAverageOpeningHand(participations) }

    var placementCounts: [PlacementCount] { Stats_placementCounts(participations) }

    var averagePlacement: Double? { Stats_averagePlacement(participations) }

    func headToHeadAnalysis(against other: Player) -> (record: H2HRecord, best: CommanderEntry?, turn: TurnOrderH2H) {
        var rec = H2HRecord()
        let otherID = other.persistentModelID
        let sharedParticipations = participations.filter { myPart in
            guard let game = myPart.game else { return false }
            return game.participants.contains(where: { $0.player?.persistentModelID == otherID })
        }

        var turn = TurnOrderH2H()
        var myTurns: [Int] = []
        var theirTurns: [Int] = []

        for myPart in sharedParticipations {
            guard let game = myPart.game else { continue }
            if myPart.didWin {
                rec.myWins += 1
            } else if game.participants.contains(where: { $0.didWin && $0.player?.persistentModelID == otherID }) {
                rec.theirWins += 1
            } else {
                rec.otherWins += 1
            }

            let theirPart = game.participants.first { $0.player?.persistentModelID == otherID }
            if myPart.turnOrder >= 0 { myTurns.append(myPart.turnOrder) }
            if let tp = theirPart, tp.turnOrder >= 0 { theirTurns.append(tp.turnOrder) }
            if let tp = theirPart, myPart.turnOrder >= 0, tp.turnOrder >= 0 {
                if myPart.turnOrder < tp.turnOrder {
                    turn.iWentBefore += 1
                } else if tp.turnOrder < myPart.turnOrder {
                    turn.theyWentBefore += 1
                }
            }
        }

        if !myTurns.isEmpty {
            turn.myAvgTurn = Double(myTurns.reduce(0, +)) / Double(myTurns.count)
        }
        if !theirTurns.isEmpty {
            turn.theirAvgTurn = Double(theirTurns.reduce(0, +)) / Double(theirTurns.count)
        }

        let best = bestEntry(from: sharedParticipations)
        return (rec, best, turn)
    }

    func allHeadToHeads(allPlayers: [Player]) -> [PlayerH2H] {
        let myID = self.persistentModelID
        return allPlayers
            .filter { $0.persistentModelID != myID }
            .map { other -> PlayerH2H in
                let analysis = headToHeadAnalysis(against: other)
                return PlayerH2H(
                    id: other.persistentModelID,
                    opponent: other,
                    record: analysis.record,
                    bestVsThem: analysis.best,
                    turnOrder: analysis.turn
                )
            }
            .filter { $0.record.total > 0 }
            .sorted { $0.record.total > $1.record.total }
    }
}

extension MTGCommander {
    var formatBreakdown: FormatBreakdown { breakdown(allParticipations) }

    var averageGameDuration: TimeInterval? { averageDuration(allParticipations) }

    var averageOpeningHand: Double? { computeAverageOpeningHand(allParticipations) }

    var placementCounts: [PlacementCount] { Stats_placementCounts(allParticipations) }

    var averagePlacement: Double? { Stats_averagePlacement(allParticipations) }

    func headToHead(against other: MTGCommander) -> (record: H2HRecord, turn: TurnOrderH2H) {
        var rec = H2HRecord()
        var turn = TurnOrderH2H()
        let myID = self.persistentModelID
        let otherID = other.persistentModelID
        guard myID != otherID else { return (rec, turn) }

        var myTurns: [Int] = []
        var theirTurns: [Int] = []

        for myPart in allParticipations {
            guard let game = myPart.game else { continue }
            let otherOnMySeat = myPart.commander?.persistentModelID == otherID
                || myPart.partnerCommander?.persistentModelID == otherID
            guard !otherOnMySeat else { continue }
            guard game.containsCommander(other) else { continue }

            if myPart.didWin {
                rec.myWins += 1
            } else if let otherPart = game.participant(withCommander: other), otherPart.didWin {
                rec.theirWins += 1
            } else {
                rec.otherWins += 1
            }

            let theirPart = game.participant(withCommander: other)
            if myPart.turnOrder >= 0 { myTurns.append(myPart.turnOrder) }
            if let tp = theirPart, tp.turnOrder >= 0 { theirTurns.append(tp.turnOrder) }
            if let tp = theirPart, myPart.turnOrder >= 0, tp.turnOrder >= 0 {
                if myPart.turnOrder < tp.turnOrder {
                    turn.iWentBefore += 1
                } else if tp.turnOrder < myPart.turnOrder {
                    turn.theyWentBefore += 1
                }
            }
        }

        if !myTurns.isEmpty {
            turn.myAvgTurn = Double(myTurns.reduce(0, +)) / Double(myTurns.count)
        }
        if !theirTurns.isEmpty {
            turn.theirAvgTurn = Double(theirTurns.reduce(0, +)) / Double(theirTurns.count)
        }

        return (rec, turn)
    }

    func allHeadToHeads(allCommanders: [MTGCommander]) -> [CommanderH2H] {
        let myID = self.persistentModelID
        return allCommanders
            .filter { $0.persistentModelID != myID }
            .map { other -> CommanderH2H in
                let analysis = headToHead(against: other)
                return CommanderH2H(
                    id: other.persistentModelID,
                    opponent: other,
                    record: analysis.record,
                    turnOrder: analysis.turn
                )
            }
            .filter { $0.record.total > 0 }
            .sorted { $0.record.total > $1.record.total }
    }

    var turnOrderCounts: [TurnOrderCount] {
        let valid = allParticipations.filter { $0.turnOrder >= 0 }
        var bucket: [Int: (count: Int, wins: Int)] = [:]
        for p in valid {
            var entry = bucket[p.turnOrder] ?? (count: 0, wins: 0)
            entry.count += 1
            if p.didWin { entry.wins += 1 }
            bucket[p.turnOrder] = entry
        }
        return bucket
            .map { TurnOrderCount(turnOrder: $0.key, count: $0.value.count, wins: $0.value.wins) }
            .sorted { $0.turnOrder < $1.turnOrder }
    }

    var averageTurnOrder: Double? {
        let valid = allParticipations.filter { $0.turnOrder >= 0 }
        guard !valid.isEmpty else { return nil }
        let sum = valid.reduce(0) { $0 + $1.turnOrder + 1 }
        return Double(sum) / Double(valid.count)
    }

    var topPilots: [CommanderPilotEntry] {
        var stats: [PersistentIdentifier: (player: Player, wins: Int, games: Int)] = [:]
        for p in allParticipations {
            guard let pl = p.player else { continue }
            let id = pl.persistentModelID
            var entry = stats[id] ?? (player: pl, wins: 0, games: 0)
            entry.games += 1
            if p.didWin { entry.wins += 1 }
            stats[id] = entry
        }
        return stats.values
            .map { CommanderPilotEntry(id: $0.player.persistentModelID, player: $0.player, wins: $0.wins, games: $0.games) }
            .sorted { lhs, rhs in
                if lhs.wins != rhs.wins { return lhs.wins > rhs.wins }
                return lhs.games > rhs.games
            }
    }
}

enum CommanderRecordsAggregator {
    static func entries(from games: [Game]) -> [CommanderEntry] {
        var dict: [String: (commanders: [MTGCommander], wins: Int, games: Int, parts: [GameParticipant])] = [:]
        for game in games {
            for p in game.participants {
                guard !p.commanders.isEmpty else { continue }
                let sorted = p.commanders.sorted { $0.name < $1.name }
                let key = sorted.map(\.name).joined(separator: " + ")
                var entry = dict[key] ?? (commanders: sorted, wins: 0, games: 0, parts: [])
                entry.games += 1
                entry.parts.append(p)
                if p.didWin { entry.wins += 1 }
                dict[key] = entry
            }
        }
        return dict.values
            .map { CommanderEntry(id: $0.commanders.map(\.name).joined(separator: " + "),
                                  commanders: $0.commanders,
                                  wins: $0.wins,
                                  games: $0.games,
                                  participations: $0.parts) }
            .sorted {
                $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending
            }
    }
}
