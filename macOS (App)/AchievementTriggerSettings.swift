//
//  AchievementTriggerSettings.swift
//  Commander (macOS)
//

import SwiftUI
import Observation

@Observable
final class AchievementTriggerSettings {
    static let shared = AchievementTriggerSettings()

    struct TriggerConfig: Codable {
        var phrases: [String]
        var matchAll: Bool
    }

    struct TriggerDef: Identifiable {
        let id: String
        let title: String
        let icon: String
        let tint: Color
        /// When true: player name must also appear in notes (checked separately from phrases).
        let requiresPlayerName: Bool
        /// When true: show a hint that {name} is a placeholder for the player's name.
        let namePlaceholderHint: Bool
        let defaultConfig: TriggerConfig
    }

    static let definitions: [TriggerDef] = [
        TriggerDef(
            id: "pacifist",
            title: "Pacifist",
            icon: "peacesign",
            tint: Color(red: 0.35, green: 0.65, blue: 0.40),
            requiresPlayerName: false,
            namePlaceholderHint: true,
            defaultConfig: TriggerConfig(
                phrases: ["{name} did not attack", "{name} was a pacifist"],
                matchAll: false
            )
        ),
        TriggerDef(
            id: "flyonthewall",
            title: "Fly On The Wall",
            icon: "eye.fill",
            tint: Color(red: 0.50, green: 0.55, blue: 0.70),
            requiresPlayerName: false,
            namePlaceholderHint: true,
            defaultConfig: TriggerConfig(
                phrases: ["{name} fly on the wall", "{name} no damage", "{name} zero damage",
                          "{name} dealt no", "{name} didn't deal"],
                matchAll: false
            )
        ),
        TriggerDef(
            id: "52pickup",
            title: "Oops, Butterfingers",
            icon: "hand.raised.slash.fill",
            tint: Color(red: 0.72, green: 0.55, blue: 0.35),
            requiresPlayerName: false,
            namePlaceholderHint: true,
            defaultConfig: TriggerConfig(
                phrases: ["{name} dropped", "{name} butterfingers", "{name} cards on the floor",
                          "{name} 52 pickup"],
                matchAll: false
            )
        ),
        TriggerDef(
            id: "nice",
            title: "Nice",
            icon: "heart.fill",
            tint: Color(red: 0.40, green: 0.75, blue: 0.45),
            requiresPlayerName: false,
            namePlaceholderHint: true,
            defaultConfig: TriggerConfig(phrases: ["{name} 69"], matchAll: false)
        ),
        TriggerDef(
            id: "jake-wizard",
            title: "Wizard, You Shall Not Cast",
            icon: "wand.and.stars",
            tint: Color(red: 0.50, green: 0.25, blue: 0.75),
            requiresPlayerName: false,
            namePlaceholderHint: false,
            defaultConfig: TriggerConfig(
                phrases: ["wizard", "didn't cast", "shall not cast", "no spells"],
                matchAll: false
            )
        ),
        TriggerDef(
            id: "margolis-graveyard",
            title: "Graveyard!?",
            icon: "trash.fill",
            tint: Color(red: 0.25, green: 0.40, blue: 0.30),
            requiresPlayerName: false,
            namePlaceholderHint: false,
            defaultConfig: TriggerConfig(phrases: ["graveyard", "hand"], matchAll: true)
        ),
        TriggerDef(
            id: "pertman-wait",
            title: "WAIT!",
            icon: "hand.raised.fill",
            tint: Color(red: 0.85, green: 0.55, blue: 0.10),
            requiresPlayerName: false,
            namePlaceholderHint: false,
            defaultConfig: TriggerConfig(phrases: ["wait", "pertman"], matchAll: true)
        ),
        TriggerDef(
            id: "noah-matthew",
            title: "404 Error: Thumb Not Found",
            icon: "hand.thumbsup.fill",
            tint: Color(red: 0.55, green: 0.65, blue: 0.90),
            requiresPlayerName: false,
            namePlaceholderHint: false,
            defaultConfig: TriggerConfig(
                phrases: ["matthew woke", "matthew wake", "matthew asleep"],
                matchAll: false
            )
        ),
        TriggerDef(
            id: "justin-rat",
            title: "Clamp Me Daddy",
            icon: "pawprint.fill",
            tint: Color(red: 0.60, green: 0.45, blue: 0.25),
            requiresPlayerName: false,
            namePlaceholderHint: false,
            defaultConfig: TriggerConfig(phrases: ["rat clamp", "rat skull"], matchAll: false)
        ),
    ]

    private var configs: [String: TriggerConfig] = [:]
    private let udKey = "com.commander.achievementTriggers"

    init() { load() }

    func config(for id: String) -> TriggerConfig {
        configs[id] ?? (Self.definitions.first { $0.id == id }?.defaultConfig
                        ?? TriggerConfig(phrases: [], matchAll: false))
    }

    func setConfig(_ newConfig: TriggerConfig, for id: String) {
        configs[id] = newConfig
        save()
    }

    func isCustomized(for id: String) -> Bool {
        configs[id] != nil
    }

    func resetToDefault(for id: String) {
        configs.removeValue(forKey: id)
        save()
    }

    /// Returns true when the given notes (already lowercased) match this achievement's trigger config.
    func matches(notes: String, id: String, playerName: String = "") -> Bool {
        let cfg = config(for: id)
        let def = Self.definitions.first { $0.id == id }
        let lower = notes.lowercased()
        let lowerName = playerName.lowercased()

        if def?.requiresPlayerName == true, !lowerName.isEmpty {
            guard lower.contains(lowerName) else { return false }
        }

        guard !cfg.phrases.isEmpty else { return false }
        let substituted = cfg.phrases.map {
            $0.replacingOccurrences(of: "{name}", with: lowerName).lowercased()
        }

        return cfg.matchAll
            ? substituted.allSatisfy { lower.contains($0) }
            : substituted.contains { lower.contains($0) }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: udKey),
              let decoded = try? JSONDecoder().decode([String: TriggerConfig].self, from: data)
        else { return }
        configs = decoded
    }

    private func save() {
        if let data = try? JSONEncoder().encode(configs) {
            UserDefaults.standard.set(data, forKey: udKey)
        }
    }
}
