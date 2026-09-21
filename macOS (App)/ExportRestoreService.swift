//
//  ExportRestoreService.swift
//  Commander (macOS)
//

import Foundation
import SwiftData

/// Rebuilds the whole SwiftData store from a `website/public/data/export.json` produced by
/// `WebExportService`. That export is written (and committed to git) after every game save, so it's
/// a complete off-machine backup of everything the app holds — this is the way back if the local
/// store is ever lost or reset.
///
/// The export is nearly lossless: it carries every player, commander (with color identity and art),
/// game, and per-participant field. The two things reconstructed rather than read back verbatim are
/// a game's `endTime` (start + the exported duration) and `chosenColorIdentity` (the export only
/// carries the resolved identity, which is what the chosen colors are merged into anyway).
enum ExportRestoreService {

    enum RestoreError: LocalizedError {
        case storeNotEmpty

        var errorDescription: String? {
            switch self {
            case .storeNotEmpty:
                return "This app already has games in it. Restoring only works into an empty store so nothing gets duplicated."
            }
        }
    }

    struct Summary {
        let players: Int
        let commanders: Int
        let games: Int
    }

    static func summarize(_ data: Data) throws -> Summary {
        let export = try JSONDecoder().decode(WebExportService.ExportData.self, from: data)
        return Summary(players: export.players.count, commanders: export.commanders.count, games: export.games.count)
    }

    @MainActor
    static func restore(from data: Data, into context: ModelContext) throws -> Summary {
        let export = try JSONDecoder().decode(WebExportService.ExportData.self, from: data)

        let existingGames = (try? context.fetchCount(FetchDescriptor<Game>())) ?? 0
        guard existingGames == 0 else { throw RestoreError.storeNotEmpty }

        for p in export.players {
            _ = PodStore.findOrCreatePlayer(named: p.name, in: context)
        }

        // Every commander, including ones with no games (partner-only or since-edited-away), so the
        // Commanders tab comes back exactly as it was.
        var exportedCommanders: [String: WebExportService.CommanderData] = [:]
        for c in export.commanders {
            exportedCommanders[c.name.lowercased()] = c
            guard let cmd = PodStore.findOrCreateCommander(named: c.name, in: context) else { continue }
            cmd.colorIdentity = c.colorIdentity
            cmd.imageURLs = c.imageURLs
        }

        var restoredGames = 0
        for g in export.games {
            guard let start = parseDate(g.date) else { continue }
            let end = g.durationSeconds.map { start.addingTimeInterval($0) }

            let game = Game(date: start, endTime: end, notes: g.notes, isInPerson: g.isInPerson)
            context.insert(game)

            for p in g.participants {
                let player = PodStore.findOrCreatePlayer(named: p.playerName, in: context)
                let commander = PodStore.findOrCreateCommander(named: p.commanderName, in: context)
                let partnerName = p.partnerCommanderName?.trimmingCharacters(in: .whitespaces) ?? ""
                let partner: MTGCommander? = partnerName.isEmpty
                    ? nil
                    : PodStore.findOrCreateCommander(named: partnerName, in: context)

                let participant = GameParticipant(
                    player: player,
                    commander: commander,
                    partnerCommander: partner,
                    didWin: p.didWin,
                    placement: p.placement,
                    turnOrder: p.turnOrder,
                    openingHandSize: p.openingHandSize > 0 ? p.openingHandSize : 7,
                    chosenColorIdentity: chosenIdentity(for: p, exportedCommanders: exportedCommanders),
                    turnsPlayed: p.turnsPlayed
                )
                context.insert(participant)
                participant.game = game
            }
            restoredGames += 1
        }

        try context.save()
        return Summary(players: export.players.count, commanders: export.commanders.count, games: restoredGames)
    }

    /// The export stores only the resolved identity, but a participation needed a chosen identity
    /// when a commander's colors can't come from Scryfall on their own — one of the always-variable
    /// cards, or one Scryfall never resolved. Setting chosen = resolved reproduces the same merged
    /// identity everywhere it's read (chosen colors are unioned with any other commander's own).
    private static func chosenIdentity(
        for p: WebExportService.ParticipantData,
        exportedCommanders: [String: WebExportService.CommanderData]
    ) -> [String]? {
        guard let resolved = p.resolvedColorIdentity, !resolved.isEmpty else { return nil }
        let names = [p.commanderName, p.partnerCommanderName]
            .compactMap { $0?.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        let needsChosen = names.contains { name in
            variableIdentityCommanderNames.contains(name.lowercased())
                || exportedCommanders[name.lowercased()]?.colorIdentity == nil
        }
        return needsChosen ? resolved : nil
    }

    private static func parseDate(_ s: String) -> Date? {
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let d = plain.date(from: s) { return d }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: s)
    }
}
