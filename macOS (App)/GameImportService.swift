//
//  GameImportService.swift
//  Commander (macOS)
//
//  Imports games logged with the website's lite "/log" form (used when
//  Noah isn't present to log games in the app directly). The JSON shape here
//  mirrors website/src/lib/logSchema.ts field-for-field — keep both in sync
//  by hand if either changes.
//

import Foundation
import SwiftData

enum GameImportService {

    struct PendingParticipant: Codable {
        var playerName: String
        var commanderName: String
        var partnerCommanderName: String?
        var turnOrder: Int
        var openingHandSize: Int
        var chosenColorIdentity: [String]
    }

    struct PendingGame: Codable {
        var date: String
        var endTime: String?
        var isInPerson: Bool
        var notes: String
        var participants: [PendingParticipant]
    }

    struct PendingGamesFile: Codable {
        var formatVersion: Int
        var submittedAt: String
        var games: [PendingGame]
    }

    enum ImportError: LocalizedError {
        case invalidJSON
        case unsupportedVersion(Int)
        case noGames

        var errorDescription: String? {
            switch self {
            case .invalidJSON: return "That file isn't a valid game log export."
            case .unsupportedVersion(let v): return "This file uses format version \(v), which this version of the app doesn't support."
            case .noGames: return "That file doesn't contain any games."
            }
        }
    }

    /// A lightweight, non-persisted preview of a file's contents, shown to
    /// the user before anything is written to the store.
    struct PreviewGame: Identifiable {
        let id = UUID()
        let date: Date
        let isInPerson: Bool
        let winnerName: String
        let participantNames: [String]
    }

    static func parse(data: Data) throws -> PendingGamesFile {
        let file: PendingGamesFile
        do {
            file = try JSONDecoder().decode(PendingGamesFile.self, from: data)
        } catch {
            throw ImportError.invalidJSON
        }
        guard file.formatVersion == 1 else {
            throw ImportError.unsupportedVersion(file.formatVersion)
        }
        guard !file.games.isEmpty else {
            throw ImportError.noGames
        }
        return file
    }

    static func preview(_ file: PendingGamesFile) -> [PreviewGame] {
        file.games.map { g in
            PreviewGame(
                date: parseDate(g.date) ?? .now,
                isInPerson: g.isInPerson,
                winnerName: g.participants.first?.playerName ?? "—",
                participantNames: g.participants.map(\.playerName)
            )
        }
    }

    /// Creates Player/Commander/Game/GameParticipant records for every game in
    /// the file, mirroring GameEditorView.save()'s find-or-create + phased
    /// insert pattern (winner-first ordering derives didWin/placement) so
    /// imported games are indistinguishable from ones logged in the app
    /// directly. Returns the number of games actually imported.
    @MainActor
    static func importGames(_ file: PendingGamesFile, into context: ModelContext) -> Int {
        var importedCount = 0

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

        for g in file.games {
            guard let startDate = parseDate(g.date) else { continue }
            let endDate = g.endTime.flatMap(parseDate)

            let validParticipants = g.participants.filter {
                !$0.playerName.trimmingCharacters(in: .whitespaces).isEmpty
            }
            guard validParticipants.count >= 2 else { continue }

            var resolved: [Resolved] = []
            for (index, p) in validParticipants.enumerated() {
                let player = PodStore.findOrCreatePlayer(named: p.playerName, in: context)
                let commander = PodStore.findOrCreateCommander(named: p.commanderName, in: context)
                let partnerName = p.partnerCommanderName?.trimmingCharacters(in: .whitespaces) ?? ""
                let partner: MTGCommander? = partnerName.isEmpty
                    ? nil
                    : PodStore.findOrCreateCommander(named: partnerName, in: context)
                let validTurn = (p.turnOrder >= 0 && p.turnOrder < validParticipants.count) ? p.turnOrder : -1
                resolved.append(Resolved(
                    player: player,
                    commander: commander,
                    partner: partner,
                    didWin: index == 0,
                    placement: index,
                    turnOrder: validTurn,
                    openingHandSize: p.openingHandSize > 0 ? p.openingHandSize : 7,
                    chosenColorIdentity: p.chosenColorIdentity
                ))
            }

            let game = Game(date: startDate, endTime: endDate, notes: g.notes, isInPerson: g.isInPerson)
            context.insert(game)

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

            importedCount += 1
        }

        try? context.save()
        return importedCount
    }

    // The website sends dates via Date#toISOString() with milliseconds
    // stripped (see formatIsoNoMillis in logSchema.ts), but accept
    // fractional-second ISO8601 too in case that ever changes.
    private static func parseDate(_ s: String) -> Date? {
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let d = plain.date(from: s) { return d }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: s)
    }
}
