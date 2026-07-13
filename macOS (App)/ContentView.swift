//
//  ContentView.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @AppStorage("isDarkMode") private var isDarkMode: Bool = true
    @Environment(\.modelContext) private var modelContext
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    NavigationLink {
                        PlayersView()
                    } label: {
                        Label("Player Records", systemImage: "person.fill")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)

                    NavigationLink {
                        CommandersView()
                    } label: {
                        Label("Commander Records", systemImage: "shield.lefthalf.filled")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)

                    NavigationLink {
                        AnnalsView()
                    } label: {
                        Label("The Annals", systemImage: "scroll.fill")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)

                    Spacer()

                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isDarkMode.toggle()
                        }
                    } label: {
                        Image(systemName: isDarkMode ? "sun.max.fill" : "moon.fill")
                            .font(.title3)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .help(isDarkMode ? "Switch to light mode" : "Switch to dark mode")

                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.title3)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .help("Achievement trigger settings")
                    .sheet(isPresented: $showSettings) {
                        SettingsView()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                Divider()

                GamesView()
            }
            .navigationTitle("Commander Tracker")
        }
        .preferredColorScheme(isDarkMode ? .dark : .light)
        .frame(minWidth: 720, minHeight: 600)
        .task {
            PodStore.backfillLegacyTurnOrders(in: modelContext)
            PodStore.backfillLegacyOpeningHands(in: modelContext)
        }
    }
}
