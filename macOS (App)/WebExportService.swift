//
//  WebExportService.swift
//  Commander (macOS)
//

import Foundation
import SwiftData

enum WebExportService {

    // MARK: - Codable export structs

    struct ExportData: Codable {
        var exportedAt: String
        var players: [PlayerData]
        var commanders: [CommanderData]
        var games: [GameData]
    }

    struct PlayerData: Codable {
        var name: String
        var wins: Int
        var losses: Int
        var totalGames: Int
        var winRate: Double
        var achievements: [AchievementData]
    }

    struct CommanderData: Codable {
        var name: String
        var colorIdentity: [String]?
        var imageURLs: [String]?
        var wins: Int
        var losses: Int
        var totalGames: Int
        var winRate: Double
    }

    struct GameData: Codable {
        var date: String
        var isInPerson: Bool
        var notes: String
        var durationSeconds: Double?
        var participants: [ParticipantData]
    }

    struct ParticipantData: Codable {
        var playerName: String
        var commanderName: String
        var partnerCommanderName: String?
        var resolvedColorIdentity: [String]?
        var didWin: Bool
        var placement: Int
        var turnOrder: Int
        var openingHandSize: Int
        var triggeredAchievements: [AchievementData]
    }

    struct AchievementData: Codable {
        var id: String
        var title: String
        var description: String
    }

    // MARK: - Color identity resolution

    private static let colorOrder = ["W", "U", "B", "R", "G"]

    private static func resolvedColorIdentity(for participation: GameParticipant) -> [String]? {
        let cmds = participation.commanders
        let hasVariable = cmds.contains {
            variableIdentityCommanderNames.contains($0.name.lowercased())
        }
        if hasVariable {
            let fixedColors = cmds
                .filter { !variableIdentityCommanderNames.contains($0.name.lowercased()) }
                .compactMap(\.colorIdentity)
                .flatMap { $0 }
            var merged = Set(fixedColors)
            if let chosen = participation.chosenColorIdentity {
                merged.formUnion(chosen)
            }
            if merged.isEmpty { return nil }
            return colorOrder.filter { merged.contains($0) }
        }
        if cmds.allSatisfy({ $0.colorIdentity == nil }) { return nil }
        let merged = Set(cmds.compactMap(\.colorIdentity).flatMap { $0 })
        return colorOrder.filter { merged.contains($0) }
    }

    // MARK: - Date formatter

    private static let iso8601: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    // MARK: - Export

    static func exportAndPush(context: ModelContext, repoPath: String) async throws {
        let jsonString = try buildJSON(context: context)
        let dataDir = URL(fileURLWithPath: repoPath)
            .appendingPathComponent("website/public/data")
        try FileManager.default.createDirectory(at: dataDir, withIntermediateDirectories: true)
        let exportURL = dataDir.appendingPathComponent("export.json")
        try jsonString.write(to: exportURL, atomically: true, encoding: .utf8)
        try await gitCommitAndPush(repoPath: repoPath)
    }

    static func buildJSON(context: ModelContext) throws -> String {
        let players = try context.fetch(FetchDescriptor<Player>())
        let commanders = try context.fetch(FetchDescriptor<MTGCommander>())
        let games = try context.fetch(FetchDescriptor<Game>())

        let achContext = computeAchievementContext(from: games)

        let playerData: [PlayerData] = players
            .sorted { $0.name < $1.name }
            .map { player in
                let earned = computeEarnedAchievements(from: player.participations, context: achContext)
                return PlayerData(
                    name: player.name,
                    wins: player.wins,
                    losses: player.losses,
                    totalGames: player.totalGames,
                    winRate: player.winRate,
                    achievements: earned.map { AchievementData(id: $0.id, title: $0.title, description: $0.description) }
                )
            }

        let commanderData: [CommanderData] = commanders
            .sorted { $0.name < $1.name }
            .map { cmd in
                CommanderData(
                    name: cmd.name,
                    colorIdentity: cmd.colorIdentity,
                    imageURLs: cmd.imageURLs,
                    wins: cmd.wins,
                    losses: cmd.losses,
                    totalGames: cmd.totalGames,
                    winRate: cmd.winRate
                )
            }

        let gameData: [GameData] = games
            .sorted { $0.date > $1.date }
            .map { game in
                let duration: Double? = game.endTime.flatMap { end in
                    let d = end.timeIntervalSince(game.date)
                    return d > 0 ? d : nil
                }
                let participants = game.participants
                    .sorted { ($0.didWin ? 0 : 1) < ($1.didWin ? 0 : 1) }
                    .map { part in
                        let triggered = perGameTriggeredAchievements(for: part)
                        return ParticipantData(
                            playerName: part.player?.name ?? "",
                            commanderName: part.commander?.name ?? "",
                            partnerCommanderName: part.partnerCommander?.name,
                            resolvedColorIdentity: resolvedColorIdentity(for: part),
                            didWin: part.didWin,
                            placement: part.placement,
                            turnOrder: part.turnOrder,
                            openingHandSize: part.openingHandSize,
                            triggeredAchievements: triggered.map {
                                AchievementData(id: $0.id, title: $0.title, description: $0.description)
                            }
                        )
                    }
                return GameData(
                    date: iso8601.string(from: game.date),
                    isInPerson: game.isInPerson,
                    notes: game.notes,
                    durationSeconds: duration,
                    participants: participants
                )
            }

        let export = ExportData(
            exportedAt: iso8601.string(from: Date()),
            players: playerData,
            commanders: commanderData,
            games: gameData
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(export)
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    // MARK: - Git

    private static func gitCommitAndPush(repoPath: String) async throws {
        try await runGit(["-C", repoPath, "add", "website/public/data/export.json"])
        // Allow "nothing to commit" (exit 1) by treating it as success
        try? await runGit(["-C", repoPath, "commit", "-m", "chore: update pod data export"])
        try await runGit(["-C", repoPath, "push"])
    }

    private static func runGit(_ arguments: [String]) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let process = Process()
            process.launchPath = "/usr/bin/git"
            process.arguments = arguments
            let errPipe = Pipe()
            process.standardOutput = Pipe()
            process.standardError = errPipe
            process.terminationHandler = { p in
                if p.terminationStatus == 0 {
                    continuation.resume()
                } else {
                    let errData = errPipe.fileHandleForReading.readDataToEndOfFile()
                    let msg = String(data: errData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "git exited \(p.terminationStatus)"
                    continuation.resume(throwing: NSError(
                        domain: "WebExport",
                        code: Int(p.terminationStatus),
                        userInfo: [NSLocalizedDescriptionKey: msg]
                    ))
                }
            }
            do { try process.run() } catch { continuation.resume(throwing: error) }
        }
    }
}
