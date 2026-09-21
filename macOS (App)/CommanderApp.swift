//
//  CommanderApp.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData

@main
struct CommanderApp: App {
    /// The app's own store file, deliberately NOT SwiftData's default `default.store`. That default
    /// is a single generic path (`~/Library/Application Support/default.store`) shared by every
    /// unsandboxed SwiftData process on the Mac — including Apple's own. After the macOS 27 upgrade,
    /// `icloudmailagent` opened that file, ran a schema migration to its own model, and dropped all of
    /// Commander's tables (the store's own transaction history records it). A uniquely-named file in
    /// the app's own folder can't be touched that way.
    private static let sharedContainer: ModelContainer = {
        let schema = Schema([
            Player.self,
            MTGCommander.self,
            Game.self,
            GameParticipant.self,
        ])
        let fm = FileManager.default
        let folder = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Commander", isDirectory: true)
        try? fm.createDirectory(at: folder, withIntermediateDirectories: true)
        let configuration = ModelConfiguration(
            schema: schema,
            url: folder.appendingPathComponent("Commander.store"),
            cloudKitDatabase: .none
        )
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Could not open the Commander data store: \(error)")
        }
    }()

    init() {
        // Show .help() tooltips after ~0.5s instead of the macOS default ~2s.
        UserDefaults.standard.register(defaults: ["NSInitialToolTipDelay": 500])
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(Self.sharedContainer)

        Settings { EmptyView() }
    }
}
