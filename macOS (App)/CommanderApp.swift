//
//  CommanderApp.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData

@main
struct CommanderApp: App {
    init() {
        // Show .help() tooltips after ~0.5s instead of the macOS default ~2s.
        UserDefaults.standard.register(defaults: ["NSInitialToolTipDelay": 500])
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [
            Player.self,
            MTGCommander.self,
            Game.self,
            GameParticipant.self,
        ])

        Settings { EmptyView() }
    }
}
