//
//  Achievements.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData
import Foundation

struct Achievement: Identifiable {
    let id: String
    let title: String
    let description: String
    let progress: String
    let display: Display
    let tint: Color
    let isEarned: Bool
    var detail: String = ""

    enum Display {
        case number(Int)
        case icon(String)
        case tally(Int)
        case iconWithCount(String, Int)
        case colorWheel(Set<String>)
        case monoColorWheel(Set<String>)
        case rainbowCrown
        case tintedNumber(Int, Color)       // number in specified color, neutral gray capsule background
        case tintedIcon(String, Color)     // icon in specified color, neutral gray circle background
        case emoji(String)
        case overlayIcon(String, String)   // base icon, overlay icon (shown small in bottom-right)
    }

    var cleanProgress: String {
        progress.hasSuffix(".") ? String(progress.dropLast()) : progress
    }

    var tooltip: String {
        let desc = description.hasSuffix(".") ? String(description.dropLast()) : description
        return detail.isEmpty ? "\(title) — \(desc)" : "\(title) — \(desc)\n\(detail)"
    }
}

private let bronzeTint   = Color(red: 0.80, green: 0.49, blue: 0.20)
private let silverTint   = Color(red: 0.72, green: 0.73, blue: 0.78)
private let goldTint     = Color(red: 0.86, green: 0.70, blue: 0.11)
private let platinumTint = Color(red: 0.78, green: 0.87, blue: 0.92)

struct AchievementContext {
    var quickestWinDuration: TimeInterval?
    var quickestLossDuration: TimeInterval?
    var longestGameDuration: TimeInterval?

    static let empty = AchievementContext()
}

func computeAchievementContext(from games: [Game]) -> AchievementContext {
    var wins: [TimeInterval] = []
    var losses: [TimeInterval] = []
    var durations: [TimeInterval] = []
    for game in games {
        guard let end = game.endTime, end > game.date else { continue }
        let dur = end.timeIntervalSince(game.date)
        durations.append(dur)
        for p in game.participants {
            if p.didWin { wins.append(dur) } else { losses.append(dur) }
        }
    }
    return AchievementContext(
        quickestWinDuration: wins.min(),
        quickestLossDuration: losses.min(),
        longestGameDuration: durations.max()
    )
}

/// Full catalog including unearned achievements — used by detail views.
func computeAchievementCatalog(
    from participations: [GameParticipant],
    context: AchievementContext = .empty,
    showPlayerAchievements: Bool = true
) -> [Achievement] {
    let wins   = participations.filter { $0.didWin }.count
    let losses = participations.filter { !$0.didWin }.count

    var result: [Achievement] = []

    // Win milestones — bronze/silver/gold/platinum trophies
    let trophyTiers: [(Int, String, Color)] = [
        (5,  "Bronze",   bronzeTint),
        (10, "Silver",   silverTint),
        (15, "Gold",     goldTint),
        (20, "Platinum", platinumTint)
    ]
    for (n, _, tint) in trophyTiers {
        let earned = wins >= n
        result.append(Achievement(
            id: "wins-\(n)",
            title: "\(n) Wins",
            description: "Win \(n) games.",
            progress: earned ? "Unlocked" : "\(wins) of \(n) wins",
            display: .icon("trophy.fill"),
            tint: tint,
            isEarned: earned
        ))
    }

    // Loss milestones — trophy with nosign overlay, matching win tier colors
    let lossTiers: [(Int, String, Color)] = [
        (5,  "Bronze",   bronzeTint),
        (10, "Silver",   silverTint),
        (15, "Gold",     goldTint),
        (20, "Platinum", platinumTint)
    ]
    for (n, _, tint) in lossTiers {
        let earned = losses >= n
        result.append(Achievement(
            id: "losses-\(n)",
            title: "\(n) Losses",
            description: "Lose \(n) games.",
            progress: earned ? "Unlocked" : "\(losses) of \(n) losses",
            display: .overlayIcon("trophy.fill", "nosign"),
            tint: tint,
            isEarned: earned
        ))
    }

    // Current win streak — resets on any loss
    let currentWinStreak = currentStreak(in: participations, winning: true)
    result.append(Achievement(
        id: "winstreak",
        title: "Win Streak",
        description: "Consecutive wins since your last loss.",
        progress: currentWinStreak > 0 ? "\(currentWinStreak) wins in a row" : "No active win streak.",
        display: .tally(currentWinStreak),
        tint: .green,
        isEarned: currentWinStreak > 0
    ))

    // Best win streak — historical best
    let bestWinStreak = longestStreak(in: participations, winning: true)
    result.append(Achievement(
        id: "bestwinstreak",
        title: "Best Win Streak",
        description: "Your longest winning streak ever.",
        progress: bestWinStreak > 0 ? "\(bestWinStreak) wins in a row (all time)" : "No wins yet.",
        display: .tally(max(bestWinStreak, 0)),
        tint: .green,
        isEarned: bestWinStreak > 0
    ))

    // Current loss streak — resets on any win
    let currentLossStreak = currentStreak(in: participations, winning: false)
    result.append(Achievement(
        id: "lossstreak",
        title: "Loss Streak",
        description: "Consecutive losses since your last win.",
        progress: currentLossStreak > 0 ? "\(currentLossStreak) losses in a row" : "No active loss streak.",
        display: .tally(currentLossStreak),
        tint: .red,
        isEarned: currentLossStreak > 0
    ))

    // Worst loss streak — historical worst
    let bestLossStreak = longestStreak(in: participations, winning: false)
    result.append(Achievement(
        id: "bestlossstreak",
        title: "Worst Loss Streak",
        description: "Your longest losing streak ever.",
        progress: bestLossStreak > 0 ? "\(bestLossStreak) losses in a row (all time)" : "No losses yet.",
        display: .tally(max(bestLossStreak, 0)),
        tint: .red,
        isEarned: bestLossStreak > 0
    ))

    // Quickest win
    result.append(recordAchievement(
        id: "quickwin",
        title: "Quickest Win",
        description: "Win the pod's fastest game on record.",
        mine: quickestGameDuration(in: participations, winning: true),
        record: context.quickestWinDuration,
        myFormat: { "Won in \(formatGameDuration($0))" },
        recordFormat: { "Record: \(formatGameDuration($0))" },
        bothFormat: { mine, rec in "Your best: \(formatGameDuration(mine)) • Record: \(formatGameDuration(rec))" },
        noMyData: "No timed wins yet.",
        noAnyData: "No timed games yet.",
        symbol: "bolt.fill",
        tint: .green
    ))

    // Quickest loss
    result.append(recordAchievement(
        id: "quickloss",
        title: "Quickest Loss",
        description: "Lose the pod's fastest game on record.",
        mine: quickestGameDuration(in: participations, winning: false),
        record: context.quickestLossDuration,
        myFormat: { "Lost in \(formatGameDuration($0))" },
        recordFormat: { "Record: \(formatGameDuration($0))" },
        bothFormat: { mine, rec in "Your best: \(formatGameDuration(mine)) • Record: \(formatGameDuration(rec))" },
        noMyData: "No timed losses yet.",
        noAnyData: "No timed games yet.",
        symbol: "bolt.fill",
        tint: .red
    ))

    // Marathon Winner
    result.append(recordAchievement(
        id: "marathonwinner",
        title: "Marathon Winner",
        description: "Win the pod's longest game on record.",
        mine: longestGameDuration(in: participations, winning: true),
        record: context.longestGameDuration,
        myFormat: { "Won a \(formatGameDuration($0)) game" },
        recordFormat: { "Record: \(formatGameDuration($0))" },
        bothFormat: { mine, rec in "Your longest win: \(formatGameDuration(mine)) • Record: \(formatGameDuration(rec))" },
        noMyData: "No timed wins yet.",
        noAnyData: "No timed games yet.",
        symbol: "figure.run",
        tint: Color(red: 0.75, green: 0.55, blue: 0.15)
    ))

    // Marathon Defeat
    result.append(recordAchievement(
        id: "marathonsurvivor",
        title: "Marathon Defeat",
        description: "Lose the pod's longest game on record.",
        mine: longestGameDuration(in: participations, winning: false),
        record: context.longestGameDuration,
        myFormat: { "Defeated in a \(formatGameDuration($0)) game" },
        recordFormat: { "Record: \(formatGameDuration($0))" },
        bothFormat: { mine, rec in "Your longest loss: \(formatGameDuration(mine)) • Record: \(formatGameDuration(rec))" },
        noMyData: "No timed losses yet.",
        noAnyData: "No timed games yet.",
        symbol: "figure.walk",
        tint: Color(red: 0.45, green: 0.55, blue: 0.75)
    ))

    // Format / Champion achievements
    var inPersonWins = 0, remoteWins = 0
    for p in participations where p.didWin {
        guard let game = p.game else { continue }
        if game.isInPerson { inPersonWins += 1 } else { remoteWins += 1 }
    }

    // Digital Champion
    result.append(Achievement(
        id: "digitalchampion",
        title: "Digital Champion",
        description: "Win a remote game.",
        progress: remoteWins > 0
            ? "Earned \(remoteWins) time\(remoteWins == 1 ? "" : "s")"
            : "Win a remote game.",
        display: .tintedIcon("crown.fill", Color(red: 0.35, green: 0.55, blue: 0.95)),
        tint: .clear,
        isEarned: remoteWins > 0
    ))

    // IRL Champion
    result.append(Achievement(
        id: "irlchampion",
        title: "IRL Champion",
        description: "Win an in-person game.",
        progress: inPersonWins > 0
            ? "Earned \(inPersonWins) time\(inPersonWins == 1 ? "" : "s")"
            : "Win an in-person game.",
        display: .tintedIcon("crown.fill", Color(red: 0.78, green: 0.80, blue: 0.85)),
        tint: .clear,
        isEarned: inPersonWins > 0
    ))

    // Format Diplomat
    let earnedDiplomat = inPersonWins > 0 && remoteWins > 0
    result.append(Achievement(
        id: "formatdiplomat",
        title: "Format Diplomat",
        description: "Win in both in-person and remote games.",
        progress: earnedDiplomat
            ? "Unlocked"
            : "Need wins in both formats (\(inPersonWins > 0 ? "✓" : "✗") in-person, \(remoteWins > 0 ? "✓" : "✗") remote).",
        display: .tintedIcon("crown.fill", goldTint),
        tint: .clear,
        isEarned: earnedDiplomat
    ))

    // Ultimate Champion
    let ultimateCount = ultimateChampionCount(in: participations)
    result.append(Achievement(
        id: "ultimatechampion",
        title: "Ultimate Champion",
        description: "Simultaneously hold the Digichampion and IRLchampion crowns.",
        progress: ultimateCount > 0
            ? "Earned \(ultimateCount) time\(ultimateCount == 1 ? "" : "s")"
            : "Simultaneously hold the crown for both formats.",
        display: .rainbowCrown,
        tint: .clear,
        isEarned: ultimateCount > 0
    ))

    // First Blood
    let firstBloods = firstBloodCount(in: participations)
    result.append(Achievement(
        id: "firstblood",
        title: "First Blood",
        description: "Win a game after going first.",
        progress: firstBloods > 0
            ? "Earned \(firstBloods) time\(firstBloods == 1 ? "" : "s")"
            : "Win a game going first.",
        display: .icon("drop.fill"),
        tint: .red,
        isEarned: firstBloods > 0
    ))

    // Come From Behind
    let cfbCount = comeFromBehindCount(in: participations)
    result.append(Achievement(
        id: "comefrombehind",
        title: "Come From Behind",
        description: "Win a game after going last.",
        progress: cfbCount > 0
            ? "Earned \(cfbCount) time\(cfbCount == 1 ? "" : "s")"
            : "Win from the last turn position.",
        display: .icon("tortoise.fill"),
        tint: Color(red: 0.25, green: 0.60, blue: 0.50),
        isEarned: cfbCount > 0
    ))

    // Botched It — went first but placed last
    let botchedCount = botchedItCount(in: participations)
    result.append(Achievement(
        id: "botchedit",
        title: "Botched It",
        description: "Go first but finish last.",
        progress: botchedCount > 0
            ? "Earned \(botchedCount) time\(botchedCount == 1 ? "" : "s")"
            : "Go first and finish last.",
        display: .icon("figure.fall"),
        tint: Color(red: 0.55, green: 0.15, blue: 0.15),
        isEarned: botchedCount > 0
    ))

    // Pacifist — never attacked another player (player name + keyword in notes)
    if showPlayerAchievements {
        let pacifistName = participations.compactMap { $0.player?.name }.first?.lowercased() ?? ""
        let pacifistCount: Int = pacifistName.isEmpty ? 0 : noteCount(in: participations) { notes in
            AchievementTriggerSettings.shared.matches(notes: notes, id: "pacifist", playerName: pacifistName)
        }
        result.append(Achievement(
            id: "pacifist",
            title: "Pacifist",
            description: "Play an entire game without attacking another player.",
            progress: pacifistCount > 0
                ? "Earned \(pacifistCount) time\(pacifistCount == 1 ? "" : "s")"
                : "Play a game without attacking anyone.",
            display: .icon("peacesign"),
            tint: Color(red: 0.35, green: 0.65, blue: 0.40),
            isEarned: pacifistCount > 0
        ))
    }

    // Fly On The Wall — never dealt any damage (player name + keyword in notes)
    if showPlayerAchievements {
        let flyName = participations.compactMap { $0.player?.name }.first?.lowercased() ?? ""
        let flyCount: Int = flyName.isEmpty ? 0 : noteCount(in: participations) { notes in
            AchievementTriggerSettings.shared.matches(notes: notes, id: "flyonthewall", playerName: flyName)
        }
        result.append(Achievement(
            id: "flyonthewall",
            title: "Fly On The Wall",
            description: "Play an entire game without dealing any damage.",
            progress: flyCount > 0
                ? "Earned \(flyCount) time\(flyCount == 1 ? "" : "s")"
                : "Play a game without dealing any damage.",
            display: .icon("eye.fill"),
            tint: Color(red: 0.50, green: 0.55, blue: 0.70),
            isEarned: flyCount > 0
        ))
    }

    // 52 Pickup — dropped cards on the floor (player name + keyword in notes)
    if showPlayerAchievements {
        let pickupName = participations.compactMap { $0.player?.name }.first?.lowercased() ?? ""
        let pickupCount: Int = pickupName.isEmpty ? 0 : noteCount(in: participations) { notes in
            AchievementTriggerSettings.shared.matches(notes: notes, id: "52pickup", playerName: pickupName)
        }
        result.append(Achievement(
            id: "52pickup",
            title: "Oops, Butterfingers",
            description: "Drop your cards on the floor.",
            progress: pickupCount > 0
                ? "Earned \(pickupCount) time\(pickupCount == 1 ? "" : "s")"
                : "Drop your cards on the floor.",
            display: .icon("hand.raised.slash.fill"),
            tint: Color(red: 0.72, green: 0.55, blue: 0.35),
            isEarned: pickupCount > 0
        ))
    }

    // Hat Trick — player-only, win 3 games in a row
    if showPlayerAchievements {
        let hatTrickEarned = bestWinStreak >= 3
        result.append(Achievement(
            id: "hattrick",
            title: "Hat Trick",
            description: "Win three games in a row.",
            progress: hatTrickEarned
                ? "Unlocked (best streak: \(bestWinStreak))"
                : bestWinStreak == 0
                    ? "No win streak yet."
                    : "Best win streak: \(bestWinStreak) of 3",
            display: .icon("flame.fill"),
            tint: Color(red: 0.95, green: 0.45, blue: 0.10),
            isEarned: hatTrickEarned
        ))
    }

    // Nice — ended the game with 69 life (player name + "69" in notes)
    if showPlayerAchievements {
        let niceName = participations.compactMap { $0.player?.name }.first?.lowercased() ?? ""
        let niceCount: Int = niceName.isEmpty ? 0 : noteCount(in: participations) { notes in
            AchievementTriggerSettings.shared.matches(notes: notes, id: "nice", playerName: niceName)
        }
        result.append(Achievement(
            id: "nice",
            title: "Nice",
            description: "End the game with exactly 69 life.",
            progress: niceCount > 0
                ? "Earned \(niceCount) time\(niceCount == 1 ? "" : "s")"
                : "End a game with 69 life.",
            display: .tintedNumber(69, Color(red: 0.40, green: 0.75, blue: 0.45)),
            tint: .clear,
            isEarned: niceCount > 0
        ))
    }

    // Veteran tiers — total games
    let totalGames = participations.count
    let veteranTiers: [(Int, String, Color)] = [
        (25,  "Bronze",   bronzeTint),
        (50,  "Silver",   silverTint),
        (75,  "Gold",     goldTint),
        (100, "Platinum", platinumTint)
    ]
    for (n, _, tint) in veteranTiers {
        let earned = totalGames >= n
        result.append(Achievement(
            id: "games-\(n)",
            title: "\(n) Games",
            description: "Play \(n) total games.",
            progress: earned ? "Unlocked" : "\(totalGames) of \(n) games",
            display: .tintedNumber(n, tint),
            tint: .clear,
            isEarned: earned
        ))
    }

    // Commander-only achievements
    if !showPlayerAchievements {
        let pilotCount = distinctPilotCount(in: participations)
        result.append(Achievement(
            id: "popularcommander",
            title: "Popular Commander",
            description: "Be piloted by 3+ different players.",
            progress: pilotCount >= 3
                ? "Unlocked (\(pilotCount) pilots)"
                : "\(pilotCount) of 3 distinct pilots",
            display: .icon("person.3.fill"),
            tint: Color(red: 0.55, green: 0.35, blue: 0.80),
            isEarned: pilotCount >= 3
        ))
    }

    // Player-only achievements
    if showPlayerAchievements {
        // Commander Connoisseur
        let distinctCount = distinctCommanderCount(in: participations)
        result.append(Achievement(
            id: "connoisseur",
            title: "Connoisseur",
            description: "Play 5+ distinct commanders.",
            progress: distinctCount >= 5
                ? "Unlocked (\(distinctCount) commanders)"
                : "\(distinctCount) of 5 distinct commanders",
            display: .icon("rectangle.stack.fill"),
            tint: Color(red: 0.20, green: 0.60, blue: 0.70),
            isEarned: distinctCount >= 5
        ))

        // Loyal Pilot
        let loyalMax = loyalPilotMax(in: participations)
        result.append(Achievement(
            id: "loyalpilot",
            title: "Loyal Pilot",
            description: "Play the same commander 10+ times.",
            progress: loyalMax >= 10
                ? "Unlocked (\(loyalMax) games)"
                : "\(loyalMax) games with favorite commander",
            display: .icon("repeat.circle.fill"),
            tint: Color(red: 0.45, green: 0.35, blue: 0.75),
            isEarned: loyalMax >= 10
        ))

        // Color achievements
        let wonCombos  = wonColorCombinations(in: participations)
        let comboToCmd = firstWinningCommanderByComboKey(in: participations)

        // Mono-Master
        let monoCompleted = wonCombos.mono
        let monoOrder: [String] = ["W", "U", "B", "R", "G", "C"]
        let monoLines = monoOrder.compactMap { c -> String? in
            guard monoCompleted.contains(c) else { return nil }
            return "• \(c == "C" ? "Colorless" : c) — \(comboToCmd[c] ?? "Unknown")"
        }
        result.append(Achievement(
            id: "monomaster",
            title: "Mono-Master",
            description: "Win with a commander of each of the 6 mono-color identities (W/U/B/R/G/Colorless).",
            progress: monoCompleted.count == 6
                ? "Unlocked"
                : "\(monoCompleted.count) of 6 mono-color identities won",
            display: .monoColorWheel(monoCompleted),
            tint: .purple,
            isEarned: monoCompleted.count == 6,
            detail: monoLines.isEmpty ? "" : "Completed:\n" + monoLines.joined(separator: "\n")
        ))

        // Dual-Master
        let wonDual     = wonCombos.dual
        let dualSegments = completedDualColorSegments(wonDual: wonDual)
        let dualOrdered = ["WU", "WB", "WR", "WG", "UB", "UR", "UG", "BR", "BG", "RG"]
        let dualLines   = dualOrdered.compactMap { combo -> String? in
            guard wonDual.contains(combo) else { return nil }
            return "• \(combo) — \(comboToCmd[combo] ?? "Unknown")"
        }
        result.append(Achievement(
            id: "dualmaster",
            title: "Dual-Master",
            description: "Win with all 10 dual-color commander combinations.",
            progress: wonDual.count == 10
                ? "Unlocked (all 10 combos)"
                : "\(wonDual.count) of 10 dual-color combinations won",
            display: .colorWheel(dualSegments),
            tint: .purple,
            isEarned: wonDual.count == 10,
            detail: dualLines.isEmpty ? "" : "Completed (\(wonDual.count)/10):\n" + dualLines.joined(separator: "\n")
        ))

        // Tri-Master
        let wonTri      = wonCombos.tri
        let triSegments  = completedTriColorSegments(wonTri: wonTri)
        let triOrdered  = ["WUB", "WUR", "WUG", "WBR", "WBG", "WRG", "UBR", "UBG", "URG", "BRG"]
        let triLines    = triOrdered.compactMap { combo -> String? in
            guard wonTri.contains(combo) else { return nil }
            return "• \(combo) — \(comboToCmd[combo] ?? "Unknown")"
        }
        result.append(Achievement(
            id: "trimaster",
            title: "Tri-Master",
            description: "Win with all 10 tri-color commander combinations.",
            progress: wonTri.count == 10
                ? "Unlocked (all 10 combos)"
                : "\(wonTri.count) of 10 tri-color combinations won",
            display: .colorWheel(triSegments),
            tint: .purple,
            isEarned: wonTri.count == 10,
            detail: triLines.isEmpty ? "" : "Completed (\(wonTri.count)/10):\n" + triLines.joined(separator: "\n")
        ))

        // Taste the Rainbow
        let tasteEarned = wonCombos.fiveColor
        result.append(Achievement(
            id: "tastetherainbow",
            title: "Taste the Rainbow",
            description: "Win a game with a 5-color (WUBRG) commander.",
            progress: tasteEarned ? "Unlocked" : "Win with a 5-color commander.",
            display: .colorWheel(tasteEarned ? ["W", "U", "B", "R", "G"] : []),
            tint: .purple,
            isEarned: tasteEarned
        ))

        // Player-specific achievements (triggered by notable moments in game notes)
        let thisPlayer = participations.compactMap { $0.player?.name }.first?.lowercased() ?? ""

        if thisPlayer.contains("jake") {
            let count = noteCount(in: participations) { notes in
                AchievementTriggerSettings.shared.matches(notes: notes, id: "jake-wizard", playerName: thisPlayer)
            }
            result.append(Achievement(
                id: "jake-wizard",
                title: "Wizard, You Shall Not Cast",
                description: "Jake doesn't cast a spell in his first three turns.",
                progress: count > 0 ? "Earned \(count) time\(count == 1 ? "" : "s")" : "Not yet earned.",
                display: .icon("wand.and.stars"),
                tint: Color(red: 0.50, green: 0.25, blue: 0.75),
                isEarned: count > 0
            ))
        }

        if thisPlayer.contains("margolis") {
            let count = noteCount(in: participations) { notes in
                AchievementTriggerSettings.shared.matches(notes: notes, id: "margolis-graveyard", playerName: thisPlayer)
            }
            result.append(Achievement(
                id: "margolis-graveyard",
                title: "Graveyard!?",
                description: "Margolis mixes up his hand and graveyard.",
                progress: count > 0 ? "Earned \(count) time\(count == 1 ? "" : "s")" : "Not yet earned.",
                display: .icon("trash.fill"),
                tint: Color(red: 0.25, green: 0.40, blue: 0.30),
                isEarned: count > 0
            ))
        }

        if thisPlayer.contains("pertman") {
            let count = noteCount(in: participations) { notes in
                AchievementTriggerSettings.shared.matches(notes: notes, id: "pertman-wait", playerName: thisPlayer)
            }
            result.append(Achievement(
                id: "pertman-wait",
                title: "WAIT!",
                description: "Pertman yells \"wait\" after his turn more than once in a single game.",
                progress: count > 0 ? "Earned \(count) time\(count == 1 ? "" : "s")" : "Not yet earned.",
                display: .icon("hand.raised.fill"),
                tint: Color(red: 0.85, green: 0.55, blue: 0.10),
                isEarned: count > 0
            ))
        }

        if thisPlayer.contains("noah") {
            let count = noteCount(in: participations) { notes in
                AchievementTriggerSettings.shared.matches(notes: notes, id: "noah-matthew", playerName: thisPlayer)
            }
            result.append(Achievement(
                id: "noah-matthew",
                title: "404 Error: Thumb Not Found",
                description: "Matthew wakes up and ruins the last game of the evening.",
                progress: count > 0 ? "Earned \(count) time\(count == 1 ? "" : "s")" : "Not yet earned.",
                display: .overlayIcon("hand.thumbsup.fill", "nosign"),
                tint: Color(red: 0.55, green: 0.65, blue: 0.90),
                isEarned: count > 0
            ))
        }

        if thisPlayer.contains("justin") {
            let count = noteCount(in: participations) { notes in
                AchievementTriggerSettings.shared.matches(notes: notes, id: "justin-rat", playerName: thisPlayer)
            }
            result.append(Achievement(
                id: "justin-rat",
                title: "Clamp Me Daddy",
                description: "Justin skullclamps a rat.",
                progress: count > 0 ? "Earned \(count) time\(count == 1 ? "" : "s")" : "Not yet earned.",
                display: .icon("pawprint.fill"),
                tint: Color(red: 0.60, green: 0.45, blue: 0.25),
                isEarned: count > 0
            ))
        }

        if thisPlayer.contains("max") {
            let count = participations.filter { $0.game != nil }.count
            result.append(Achievement(
                id: "max-zeus",
                title: "Look What the Zeus Dragged In",
                description: "Max graces the table with his presence.",
                progress: count > 0 ? "Earned \(count) time\(count == 1 ? "" : "s")" : "Not yet earned.",
                display: .icon("cat.fill"),
                tint: Color(red: 0.85, green: 0.65, blue: 0.20),
                isEarned: count > 0
            ))
        }
    }

    return result
}

private func recordAchievement(
    id: String,
    title: String,
    description: String,
    mine: TimeInterval?,
    record: TimeInterval?,
    myFormat: (TimeInterval) -> String,
    recordFormat: (TimeInterval) -> String,
    bothFormat: (TimeInterval, TimeInterval) -> String,
    noMyData: String,
    noAnyData: String,
    symbol: String = "bolt.fill",
    tint: Color
) -> Achievement {
    let isHolder: Bool
    let progress: String
    switch (mine, record) {
    case let (mine?, record?) where abs(mine - record) < 1.0:
        isHolder = true
        progress = myFormat(mine)
    case let (mine?, record?):
        isHolder = false
        progress = bothFormat(mine, record)
    case (nil, let record?):
        isHolder = false
        progress = "\(noMyData) \(recordFormat(record))"
    case (let mine?, nil):
        isHolder = true
        progress = myFormat(mine)
    case (nil, nil):
        isHolder = false
        progress = noAnyData
    }
    return Achievement(
        id: id,
        title: title,
        description: description,
        progress: progress,
        display: .icon(symbol),
        tint: tint,
        isEarned: isHolder
    )
}

/// Compact list of earned achievements — used by expanded detail views.
func computeEarnedAchievements(
    from participations: [GameParticipant],
    context: AchievementContext = .empty,
    showPlayerAchievements: Bool = true
) -> [Achievement] {
    let catalog = computeAchievementCatalog(from: participations, context: context, showPlayerAchievements: showPlayerAchievements)
    var result: [Achievement] = []

    if let top = catalog.last(where: { $0.id.hasPrefix("wins-") && $0.isEarned })      { result.append(top) }
    if let top = catalog.last(where: { $0.id.hasPrefix("losses-") && $0.isEarned })    { result.append(top) }
    if let a = catalog.first(where: { $0.id == "winstreak"        && $0.isEarned })    { result.append(a) }
    if let a = catalog.first(where: { $0.id == "bestwinstreak"    && $0.isEarned })    { result.append(a) }
    if let a = catalog.first(where: { $0.id == "lossstreak"       && $0.isEarned })    { result.append(a) }
    if let a = catalog.first(where: { $0.id == "bestlossstreak"   && $0.isEarned })    { result.append(a) }
    if let a = catalog.first(where: { $0.id == "quickwin"         && $0.isEarned })    { result.append(a) }
    if let a = catalog.first(where: { $0.id == "quickloss"        && $0.isEarned })    { result.append(a) }
    if let a = catalog.first(where: { $0.id == "marathonwinner"   && $0.isEarned })    { result.append(a) }
    if let a = catalog.first(where: { $0.id == "marathonsurvivor" && $0.isEarned })    { result.append(a) }

    for id in ["digitalchampion", "irlchampion", "formatdiplomat", "ultimatechampion",
               "firstblood", "comefrombehind", "botchedit", "pacifist", "flyonthewall", "52pickup", "hattrick", "nice"] {
        if let a = catalog.first(where: { $0.id == id && $0.isEarned }) { result.append(a) }
    }

    if let top = catalog.last(where: { $0.id.hasPrefix("games-") && $0.isEarned })     { result.append(top) }

    for id in ["popularcommander",
               "connoisseur", "loyalpilot",
               "monomaster", "dualmaster", "trimaster", "tastetherainbow",
               "jake-wizard", "margolis-graveyard", "pertman-wait", "noah-matthew", "justin-rat", "max-zeus"] {
        if let a = catalog.first(where: { $0.id == id && $0.isEarned }) { result.append(a) }
    }
    return result
}

/// Returns achievements triggered by a single participation — used by game logs to show badges every time they fire.
func perGameTriggeredAchievements(for participation: GameParticipant) -> [Achievement] {
    var result: [Achievement] = []
    guard let game = participation.game else { return result }
    let notes = game.notes.lowercased()
    let allParts = game.participants

    // First Blood
    if participation.didWin && participation.turnOrder == 0 {
        result.append(Achievement(
            id: "firstblood", title: "First Blood",
            description: "Win a game after going first.",
            progress: "Earned this game",
            display: .icon("drop.fill"), tint: .red, isEarned: true
        ))
    }

    // Come From Behind
    let validTurns = allParts.compactMap { $0.turnOrder >= 0 ? $0.turnOrder : nil }
    if participation.didWin && participation.turnOrder >= 0 && validTurns.count >= 2,
       let maxTurn = validTurns.max(), participation.turnOrder == maxTurn {
        result.append(Achievement(
            id: "comefrombehind", title: "Come From Behind",
            description: "Win a game after going last.",
            progress: "Earned this game",
            display: .icon("tortoise.fill"),
            tint: Color(red: 0.25, green: 0.60, blue: 0.50), isEarned: true
        ))
    }

    // Digital Champion
    if participation.didWin && !game.isInPerson {
        result.append(Achievement(
            id: "digitalchampion", title: "Digital Champion",
            description: "Win a remote game.",
            progress: "Earned this game",
            display: .tintedIcon("crown.fill", Color(red: 0.35, green: 0.55, blue: 0.95)),
            tint: .clear, isEarned: true
        ))
    }

    // IRL Champion
    if participation.didWin && game.isInPerson {
        result.append(Achievement(
            id: "irlchampion", title: "IRL Champion",
            description: "Win an in-person game.",
            progress: "Earned this game",
            display: .tintedIcon("crown.fill", Color(red: 0.78, green: 0.80, blue: 0.85)),
            tint: .clear, isEarned: true
        ))
    }

    // Botched It
    let placements = allParts.map { $0.placement }
    if participation.turnOrder == 0 && placements.count >= 2,
       let maxPlacement = placements.max(), participation.placement == maxPlacement {
        result.append(Achievement(
            id: "botchedit", title: "Botched It",
            description: "Go first but finish last.",
            progress: "Earned this game",
            display: .icon("figure.fall"),
            tint: Color(red: 0.55, green: 0.15, blue: 0.15), isEarned: true
        ))
    }

    let playerName = participation.player?.name.lowercased() ?? ""

    // Pacifist
    if !playerName.isEmpty &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "pacifist", playerName: playerName) {
        result.append(Achievement(
            id: "pacifist", title: "Pacifist",
            description: "Play an entire game without attacking another player.",
            progress: "Earned this game",
            display: .icon("peacesign"),
            tint: Color(red: 0.35, green: 0.65, blue: 0.40),
            isEarned: true
        ))
    }

    // Fly On The Wall
    if !playerName.isEmpty &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "flyonthewall", playerName: playerName) {
        result.append(Achievement(
            id: "flyonthewall", title: "Fly On The Wall",
            description: "Play an entire game without dealing any damage.",
            progress: "Earned this game",
            display: .icon("eye.fill"),
            tint: Color(red: 0.50, green: 0.55, blue: 0.70),
            isEarned: true
        ))
    }

    // 52 Pickup
    if !playerName.isEmpty &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "52pickup", playerName: playerName) {
        result.append(Achievement(
            id: "52pickup", title: "52 Pickup",
            description: "Drop your cards on the floor.",
            progress: "Earned this game",
            display: .icon("hand.raised.slash.fill"),
            tint: Color(red: 0.72, green: 0.55, blue: 0.35),
            isEarned: true
        ))
    }

    // Nice
    if !playerName.isEmpty && AchievementTriggerSettings.shared.matches(notes: notes, id: "nice", playerName: playerName) {
        result.append(Achievement(
            id: "nice", title: "Nice",
            description: "End the game with exactly 69 life.",
            progress: "Earned this game",
            display: .tintedNumber(69, Color(red: 0.40, green: 0.75, blue: 0.45)),
            tint: .clear,
            isEarned: true
        ))
    }

    if playerName.contains("jake") &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "jake-wizard", playerName: playerName) {
        result.append(Achievement(
            id: "jake-wizard", title: "Wizard, You Shall Not Cast",
            description: "Jake doesn't cast a spell in his first three turns.",
            progress: "Earned this game",
            display: .icon("wand.and.stars"),
            tint: Color(red: 0.50, green: 0.25, blue: 0.75), isEarned: true
        ))
    }

    if playerName.contains("margolis") &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "margolis-graveyard", playerName: playerName) {
        result.append(Achievement(
            id: "margolis-graveyard", title: "Graveyard!?",
            description: "Margolis mixes up his hand and graveyard.",
            progress: "Earned this game",
            display: .icon("trash.fill"),
            tint: Color(red: 0.25, green: 0.40, blue: 0.30), isEarned: true
        ))
    }

    if playerName.contains("pertman") &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "pertman-wait", playerName: playerName) {
        result.append(Achievement(
            id: "pertman-wait", title: "WAIT!",
            description: "Pertman yells \"wait\" after his turn more than once in a single game.",
            progress: "Earned this game",
            display: .icon("hand.raised.fill"),
            tint: Color(red: 0.85, green: 0.55, blue: 0.10), isEarned: true
        ))
    }

    if playerName.contains("noah") &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "noah-matthew", playerName: playerName) {
        result.append(Achievement(
            id: "noah-matthew", title: "404 Error: Thumb Not Found",
            description: "Matthew wakes up and ruins the last game of the evening.",
            progress: "Earned this game",
            display: .overlayIcon("hand.thumbsup.fill", "nosign"),
            tint: Color(red: 0.55, green: 0.65, blue: 0.90), isEarned: true
        ))
    }

    if playerName.contains("justin") &&
       AchievementTriggerSettings.shared.matches(notes: notes, id: "justin-rat", playerName: playerName) {
        result.append(Achievement(
            id: "justin-rat", title: "Clamp Me Daddy",
            description: "Justin skullclamps a rat.",
            progress: "Earned this game",
            display: .icon("pawprint.fill"),
            tint: Color(red: 0.60, green: 0.45, blue: 0.25), isEarned: true
        ))
    }

    if playerName.contains("max") {
        result.append(Achievement(
            id: "max-zeus", title: "Look What the Zeus Dragged In",
            description: "Max graces the table with their presence.",
            progress: "Earned this game",
            display: .icon("cat.fill"),
            tint: Color(red: 0.85, green: 0.65, blue: 0.20), isEarned: true
        ))
    }

    return result
}

/// Returns a map of achievement ID → the date that achievement was first earned.
func achievementEarnedDates(
    for participations: [GameParticipant],
    allGames: [Game],
    showPlayerAchievements: Bool = true
) -> [String: Date] {
    var result: [String: Date] = [:]
    let sorted = participations.compactMap { p -> (Date, GameParticipant)? in
        guard let date = p.game?.date else { return nil }
        return (date, p)
    }.sorted { $0.0 < $1.0 }

    var previouslyEarned = Set<String>()
    for i in sorted.indices {
        let date = sorted[i].0
        let upTo = Array(sorted[0...i].map(\.1))
        let ctx = computeAchievementContext(from: allGames.filter { $0.date <= date })
        let nowEarned = Set(
            computeEarnedAchievements(from: upTo, context: ctx, showPlayerAchievements: showPlayerAchievements).map(\.id)
        )
        for newID in nowEarned.subtracting(previouslyEarned) {
            result[newID] = date
        }
        previouslyEarned = nowEarned
    }
    return result
}

/// Current win/loss streak badges for row display — shows only active streaks.
func currentStreakAchievements(from participations: [GameParticipant]) -> [Achievement] {
    var result: [Achievement] = []
    let winStreak = currentStreak(in: participations, winning: true)
    if winStreak > 0 {
        result.append(Achievement(
            id: "row-winstreak",
            title: "Win Streak",
            description: "Currently on a \(winStreak)-game win streak.",
            progress: "\(winStreak) wins in a row",
            display: .tally(winStreak),
            tint: .green,
            isEarned: true
        ))
    }
    let lossStreak = currentStreak(in: participations, winning: false)
    if lossStreak > 0 {
        result.append(Achievement(
            id: "row-lossstreak",
            title: "Loss Streak",
            description: "Currently on a \(lossStreak)-game loss streak.",
            progress: "\(lossStreak) losses in a row",
            display: .tally(lossStreak),
            tint: .red,
            isEarned: true
        ))
    }
    return result
}

// MARK: - Private helpers

private func longestStreak(in participations: [GameParticipant], winning: Bool) -> Int {
    let sorted = participations.compactMap { p -> (Date, Bool)? in
        guard let game = p.game else { return nil }
        return (game.date, p.didWin)
    }.sorted { $0.0 < $1.0 }

    var maxStreak = 0, current = 0
    for (_, didWin) in sorted {
        if didWin == winning { current += 1; maxStreak = max(maxStreak, current) }
        else { current = 0 }
    }
    return maxStreak
}

private func currentStreak(in participations: [GameParticipant], winning: Bool) -> Int {
    let sorted = participations.compactMap { p -> (Date, Bool)? in
        guard let game = p.game else { return nil }
        return (game.date, p.didWin)
    }.sorted { $0.0 > $1.0 }  // most recent first

    var streak = 0
    for (_, didWin) in sorted {
        if didWin == winning { streak += 1 }
        else { break }
    }
    return streak
}

private func quickestGameDuration(in participations: [GameParticipant], winning: Bool) -> TimeInterval? {
    participations.compactMap { p -> TimeInterval? in
        guard p.didWin == winning,
              let game = p.game,
              let end = game.endTime,
              end > game.date else { return nil }
        return end.timeIntervalSince(game.date)
    }.min()
}

private func longestGameDuration(in participations: [GameParticipant], winning: Bool) -> TimeInterval? {
    participations.compactMap { p -> TimeInterval? in
        guard p.didWin == winning,
              let game = p.game,
              let end = game.endTime,
              end > game.date else { return nil }
        return end.timeIntervalSince(game.date)
    }.max()
}

private func firstBloodCount(in participations: [GameParticipant]) -> Int {
    participations.filter { $0.didWin && $0.turnOrder == 0 }.count
}

private func botchedItCount(in participations: [GameParticipant]) -> Int {
    participations.filter { p in
        guard p.turnOrder == 0, let game = p.game else { return false }
        let placements = game.participants.map { $0.placement }
        guard placements.count >= 2, let maxPlacement = placements.max() else { return false }
        return p.placement == maxPlacement
    }.count
}

private func ultimateChampionCount(in participations: [GameParticipant]) -> Int {
    let sorted = participations.compactMap { p -> (Date, GameParticipant)? in
        guard let date = p.game?.date else { return nil }
        return (date, p)
    }.sorted { $0.0 < $1.0 }.map(\.1)
    var lastInPersonWin: Bool? = nil
    var lastRemoteWin: Bool? = nil
    var count = 0
    for p in sorted {
        guard let game = p.game else { continue }
        let wasUltimate = lastInPersonWin == true && lastRemoteWin == true
        if game.isInPerson { lastInPersonWin = p.didWin } else { lastRemoteWin = p.didWin }
        let isUltimate = lastInPersonWin == true && lastRemoteWin == true
        if isUltimate && !wasUltimate { count += 1 }
    }
    return count
}

private func comeFromBehindCount(in participations: [GameParticipant]) -> Int {
    participations.filter { p in
        guard p.didWin, p.turnOrder >= 0, let game = p.game else { return false }
        let validTurns = game.participants.compactMap { $0.turnOrder >= 0 ? $0.turnOrder : nil }
        guard validTurns.count >= 2, let maxTurn = validTurns.max() else { return false }
        return p.turnOrder == maxTurn
    }.count
}

private func loyalPilotMax(in participations: [GameParticipant]) -> Int {
    var counts: [String: Int] = [:]
    for p in participations {
        guard !p.commanders.isEmpty else { continue }
        let key = p.commanders.sorted { $0.name < $1.name }.map(\.name).joined(separator: "+")
        counts[key, default: 0] += 1
    }
    return counts.values.max() ?? 0
}

private func distinctPilotCount(in participations: [GameParticipant]) -> Int {
    Set(participations.compactMap { $0.player?.persistentModelID }).count
}

private func noteCount(in participations: [GameParticipant], match: (String) -> Bool) -> Int {
    var seen = Set<PersistentIdentifier>()
    var count = 0
    for p in participations {
        guard let game = p.game,
              seen.insert(game.persistentModelID).inserted else { continue }
        if match(game.notes.lowercased()) { count += 1 }
    }
    return count
}

private func distinctCommanderCount(in participations: [GameParticipant]) -> Int {
    var keys = Set<String>()
    for p in participations {
        guard !p.commanders.isEmpty else { continue }
        keys.insert(p.commanders.sorted { $0.name < $1.name }.map(\.name).joined(separator: "+"))
    }
    return keys.count
}

private let colorOrder = ["W", "U", "B", "R", "G"]

private let dualCombosPerColor: [String: Set<String>] = [
    "W": ["WU", "WB", "WR", "WG"],
    "U": ["WU", "UB", "UR", "UG"],
    "B": ["WB", "UB", "BR", "BG"],
    "R": ["WR", "UR", "BR", "RG"],
    "G": ["WG", "UG", "BG", "RG"]
]

private let triCombosPerColor: [String: Set<String>] = [
    "W": ["WUB", "WUR", "WUG", "WBR", "WBG", "WRG"],
    "U": ["WUB", "WUR", "WUG", "UBR", "UBG", "URG"],
    "B": ["WUB", "WBR", "WBG", "UBR", "UBG", "BRG"],
    "R": ["WUR", "WBR", "WRG", "UBR", "URG", "BRG"],
    "G": ["WUG", "WBG", "WRG", "UBG", "URG", "BRG"]
]

private func wonColorCombinations(
    in participations: [GameParticipant]
) -> (mono: Set<String>, dual: Set<String>, tri: Set<String>, fiveColor: Bool) {
    var mono = Set<String>()
    var dual = Set<String>()
    var tri  = Set<String>()
    var fiveColor = false

    for p in participations where p.didWin {
        let allColors: [String]
        if let chosen = p.chosenColorIdentity, !chosen.isEmpty {
            // Merge chosen identity with fixed (non-variable) commanders' colors.
            let fixedColors = p.commanders
                .filter { !variableIdentityCommanderNames.contains($0.name.lowercased()) }
                .compactMap(\.colorIdentity)
                .flatMap { $0 }
            allColors = chosen + fixedColors
        } else {
            guard !p.commanders.isEmpty,
                  p.commanders.allSatisfy({ $0.colorIdentity != nil }) else { continue }
            allColors = p.commanders.compactMap(\.colorIdentity).flatMap { $0 }
        }
        let colorSet  = Set(allColors.filter { colorOrder.contains($0) })
        let key = colorOrder.filter { colorSet.contains($0) }.joined()
        switch colorSet.count {
        case 0: mono.insert("C")
        case 1: mono.insert(key)
        case 2: dual.insert(key)
        case 3: tri.insert(key)
        case 5: fiveColor = true
        default: break
        }
    }
    return (mono, dual, tri, fiveColor)
}

private func firstWinningCommanderByComboKey(in participations: [GameParticipant]) -> [String: String] {
    var result: [String: String] = [:]
    let sorted = participations.compactMap { p -> (Date, GameParticipant)? in
        guard let d = p.game?.date else { return nil }
        return (d, p)
    }.sorted { $0.0 < $1.0 }

    for (_, p) in sorted where p.didWin {
        let allColors: [String]
        if let chosen = p.chosenColorIdentity, !chosen.isEmpty {
            let fixedColors = p.commanders
                .filter { !variableIdentityCommanderNames.contains($0.name.lowercased()) }
                .compactMap(\.colorIdentity)
                .flatMap { $0 }
            allColors = chosen + fixedColors
        } else {
            guard !p.commanders.isEmpty,
                  p.commanders.allSatisfy({ $0.colorIdentity != nil }) else { continue }
            allColors = p.commanders.compactMap(\.colorIdentity).flatMap { $0 }
        }
        let colorSet  = Set(allColors.filter { colorOrder.contains($0) })
        let key: String = colorSet.isEmpty ? "C" : colorOrder.filter { colorSet.contains($0) }.joined()
        if result[key] == nil {
            result[key] = p.commanders.sorted { $0.name < $1.name }.map(\.name).joined(separator: " + ")
        }
    }
    return result
}

private func completedDualColorSegments(wonDual: Set<String>) -> Set<String> {
    var completed = Set<String>()
    for (color, combos) in dualCombosPerColor {
        if combos.isSubset(of: wonDual) { completed.insert(color) }
    }
    return completed
}

private func completedTriColorSegments(wonTri: Set<String>) -> Set<String> {
    var completed = Set<String>()
    for (color, combos) in triCombosPerColor {
        if combos.isSubset(of: wonTri) { completed.insert(color) }
    }
    return completed
}

// MARK: - Extensions

extension Player {
    func achievements(context: AchievementContext) -> [Achievement] {
        computeEarnedAchievements(from: participations, context: context, showPlayerAchievements: true)
    }
    func achievementCatalog(context: AchievementContext) -> [Achievement] {
        computeAchievementCatalog(from: participations, context: context, showPlayerAchievements: true)
    }
    func currentStreakBadges() -> [Achievement] {
        currentStreakAchievements(from: participations)
    }
}

extension MTGCommander {
    func achievements(context: AchievementContext) -> [Achievement] {
        computeEarnedAchievements(from: allParticipations, context: context, showPlayerAchievements: false)
    }
    func achievementCatalog(context: AchievementContext) -> [Achievement] {
        computeAchievementCatalog(from: allParticipations, context: context, showPlayerAchievements: false)
    }
    func currentStreakBadges() -> [Achievement] {
        currentStreakAchievements(from: allParticipations)
    }
}

extension CommanderEntry {
    func achievements(context: AchievementContext) -> [Achievement] {
        computeEarnedAchievements(from: comboParticipations, context: context, showPlayerAchievements: false)
    }
    func achievementCatalog(context: AchievementContext) -> [Achievement] {
        computeAchievementCatalog(from: comboParticipations, context: context, showPlayerAchievements: false)
    }
    func currentStreakBadges() -> [Achievement] {
        currentStreakAchievements(from: comboParticipations)
    }

    private var comboParticipations: [GameParticipant] {
        let comboIDs = Set(commanders.map { $0.persistentModelID })
        return (commanders.first?.allParticipations ?? []).filter { p in
            Set(p.commanders.map { $0.persistentModelID }) == comboIDs
        }
    }
}

// MARK: - Views

extension View {
    func hoverTooltip(_ text: String) -> some View {
        self.help(text)
    }
}

struct AchievementBadgeRow: View {
    let achievements: [Achievement]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(achievements) { ach in
                AchievementBadge(achievement: ach)
                    .hoverTooltip(ach.tooltip)
            }
        }
    }
}

struct AchievementBadge: View {
    let achievement: Achievement

    var body: some View {
        content
    }

    @ViewBuilder
    private var content: some View {
        switch achievement.display {
        case .number(let n):
            Text("\(n)")
                .font(.system(size: 10, weight: .heavy).monospacedDigit())
                .foregroundStyle(achievement.isEarned ? .white : .secondary)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(Capsule().fill(achievement.isEarned ? achievement.tint : Color.clear))
                .overlay(Capsule().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
                .contentShape(Capsule())

        case .tintedNumber(let n, let numColor):
            Text("\(n)")
                .font(.system(size: 10, weight: .heavy).monospacedDigit())
                .foregroundStyle(achievement.isEarned ? numColor : .secondary)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(Capsule().fill(achievement.isEarned ? Color.gray.opacity(0.35) : Color.clear))
                .overlay(Capsule().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
                .contentShape(Capsule())

        case .icon(let symbol):
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(achievement.isEarned ? .white : .secondary)
                .frame(width: 20, height: 20)
                .background(Circle().fill(achievement.isEarned ? achievement.tint : Color.clear))
                .overlay(Circle().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
                .contentShape(Circle())

        case .tally(let n):
            Group {
                if n > 0 {
                    TallyMarksView(count: n, tint: achievement.tint)
                } else {
                    Text("—")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .frame(minWidth: 20)
                }
            }
            .contentShape(Rectangle())

        case .iconWithCount(let symbol, let count):
            HStack(spacing: 2) {
                Image(systemName: symbol)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(achievement.isEarned ? .white : .secondary)
                if count > 1 {
                    Text("×\(count)")
                        .font(.system(size: 8, weight: .heavy).monospacedDigit())
                        .foregroundStyle(achievement.isEarned ? .white.opacity(0.9) : .secondary)
                }
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(Capsule().fill(achievement.isEarned ? achievement.tint : Color.clear))
            .overlay(Capsule().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
            .contentShape(Capsule())

        case .colorWheel(let colors):
            ColorWheelBadgeView(completedColors: colors, size: 20)
                .overlay(Circle().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.4), lineWidth: 1))
                .contentShape(Circle())

        case .monoColorWheel(let colors):
            ColorWheelBadgeView(completedColors: colors, segments: ["W", "U", "B", "R", "G", "C"], size: 20)
                .overlay(Circle().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.4), lineWidth: 1))
                .contentShape(Circle())

        case .rainbowCrown:
            Group {
                if achievement.isEarned {
                    ChampionCrown(style: .rainbow, font: .caption)
                } else {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 20, height: 20)
            .background(Circle().fill(achievement.isEarned ? Color.gray.opacity(0.35) : Color.clear))
            .overlay(Circle().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
            .contentShape(Circle())

        case .tintedIcon(let symbol, let iconColor):
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(achievement.isEarned ? iconColor : .secondary)
                .frame(width: 20, height: 20)
                .background(Circle().fill(achievement.isEarned ? Color.gray.opacity(0.35) : Color.clear))
                .overlay(Circle().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
                .contentShape(Circle())

        case .emoji(let char):
            Text(char)
                .font(.system(size: 13))
                .frame(width: 20, height: 20)
                .opacity(achievement.isEarned ? 1.0 : 0.35)
                .overlay(Circle().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
                .contentShape(Circle())

        case .overlayIcon(let base, let overlay):
            ZStack {
                Image(systemName: base)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(achievement.isEarned ? .white : .secondary)
                Image(systemName: overlay)
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundStyle(achievement.isEarned ? .red : .secondary.opacity(0.6))
            }
            .frame(width: 20, height: 20)
            .background(Circle().fill(achievement.isEarned ? achievement.tint : Color.clear))
            .overlay(Circle().stroke(achievement.isEarned ? Color.clear : Color.secondary.opacity(0.5), lineWidth: 1))
            .clipShape(Circle())
            .contentShape(Circle())
        }
    }
}

struct AchievementCatalogView: View {
    let catalog: [Achievement]
    var earnedDates: [String: Date] = [:]

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
            ForEach(catalog) { ach in
                catalogRow(ach)
            }
        }
    }

    private func catalogRow(_ ach: Achievement) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 8) {
                AchievementBadge(achievement: ach)
                    .frame(width: 36, alignment: .center)
                VStack(alignment: .leading, spacing: 1) {
                    Text(ach.title)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(ach.isEarned ? .primary : .secondary)
                    Text(ach.cleanProgress)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            if ach.isEarned, let date = earnedDates[ach.id] {
                Text(date, format: .dateTime.month(.abbreviated).day().year())
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(.leading, 44)
            }
        }
        .opacity(ach.isEarned ? 1.0 : 0.6)
        .hoverTooltip(ach.tooltip)
    }
}

struct TallyMarksView: View {
    let count: Int
    var tint: Color = .primary

    private var groups: Int    { count / 5 }
    private var remainder: Int { count % 5 }

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<groups, id: \.self) { _ in TallyGroup(filled: 5, tint: tint) }
            if remainder > 0 { TallyGroup(filled: remainder, tint: tint) }
        }
    }
}

private struct TallyGroup: View {
    let filled: Int
    let tint: Color

    var body: some View {
        ZStack {
            HStack(spacing: 1.5) {
                ForEach(0..<4, id: \.self) { i in
                    Capsule()
                        .fill(i < min(filled, 4) ? tint : Color.clear)
                        .frame(width: 1.5, height: 12)
                }
            }
            if filled >= 5 {
                Rectangle()
                    .fill(tint)
                    .frame(width: 14, height: 1.5)
                    .rotationEffect(.degrees(-25))
            }
        }
        .frame(width: 14, height: 14)
    }
}

struct ColorWheelBadgeView: View {
    let completedColors: Set<String>
    var segments: [String] = ["W", "U", "B", "R", "G"]
    var size: CGFloat = 20

    var body: some View {
        Canvas { ctx, canvasSize in
            let center = CGPoint(x: canvasSize.width / 2, y: canvasSize.height / 2)
            let radius = min(canvasSize.width, canvasSize.height) / 2
            let step   = 360.0 / Double(segments.count)

            for (i, color) in segments.enumerated() {
                let startDeg = -90.0 + Double(i) * step
                var path = Path()
                path.move(to: center)
                path.addArc(center: center, radius: radius,
                            startAngle: .degrees(startDeg),
                            endAngle: .degrees(startDeg + step),
                            clockwise: false)
                path.closeSubpath()
                ctx.fill(path, with: .color(
                    completedColors.contains(color) ? mtgColor(color) : Color.secondary.opacity(0.18)
                ))
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private func mtgColor(_ c: String) -> Color {
        switch c {
        case "W": return Color(white: 0.90)
        case "U": return Color(red: 0.13, green: 0.45, blue: 0.76)
        case "B": return Color(red: 0.20, green: 0.18, blue: 0.22)
        case "R": return Color(red: 0.82, green: 0.20, blue: 0.15)
        case "G": return Color(red: 0.18, green: 0.52, blue: 0.25)
        case "C": return Color(red: 0.72, green: 0.70, blue: 0.62)
        default:  return .gray
        }
    }
}
