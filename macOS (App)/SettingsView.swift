//
//  SettingsView.swift
//  Commander (macOS)
//

import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    private let settings = AchievementTriggerSettings.shared

    @State private var addingTo: String? = nil
    @State private var draftPhrase: String = ""
    @State private var editingTarget: EditingTarget? = nil
    @State private var editDraft: String = ""

    @AppStorage("webExportRepoPath") private var repoPath: String = ""
    @State private var isExporting = false
    @State private var exportMessage: String? = nil
    @State private var exportIsError = false

    @State private var importMessage: String? = nil
    @State private var importIsError = false
    @State private var pendingImportFile: GameImportService.PendingGamesFile?
    @State private var showImportPreview = false

    private struct EditingTarget: Equatable {
        let defId: String
        let index: Int
    }

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            Divider()
            columnHeaderRow
            Divider()
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(AchievementTriggerSettings.definitions) { def in
                        achievementRow(def)
                        Divider()
                    }
                }
            }
            Divider()
            webExportSection
            Divider()
            importGamesSection
        }
        .frame(width: 680, height: 700)
        .sheet(isPresented: $showImportPreview) {
            if let file = pendingImportFile {
                ImportPreviewSheet(
                    file: file,
                    onCancel: {
                        pendingImportFile = nil
                        showImportPreview = false
                    },
                    onConfirm: {
                        commitImport(file)
                    }
                )
            }
        }
    }

    // MARK: - Header

    private var headerBar: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Achievement Triggers")
                    .font(.title3.bold())
                Text("Edit the notes keywords that trigger each achievement. Changes are applied immediately.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Save Changes") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Column headers

    private var columnHeaderRow: some View {
        HStack(spacing: 0) {
            Text("ACHIEVEMENT")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .frame(width: 210, alignment: .leading)
                .padding(.leading, 16)
            Rectangle()
                .fill(Color.secondary.opacity(0.15))
                .frame(width: 1, height: 14)
            Text("TRIGGER PHRASES")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.leading, 14)
            Spacer()
        }
        .padding(.vertical, 5)
        .background(Color.secondary.opacity(0.05))
    }

    // MARK: - Achievement row

    @ViewBuilder
    private func achievementRow(_ def: AchievementTriggerSettings.TriggerDef) -> some View {
        let cfg = settings.config(for: def.id)

        HStack(alignment: .top, spacing: 0) {

            // Left: badge + title
            HStack(spacing: 8) {
                badgeIcon(def)
                Text(def.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: 210, alignment: .leading)
            .padding(.leading, 16)
            .padding(.vertical, 10)

            Rectangle()
                .fill(Color.secondary.opacity(0.15))
                .frame(width: 1)

            // Right: match mode + phrase list + add
            VStack(alignment: .leading, spacing: 6) {

                // Match mode + reset
                HStack(spacing: 8) {
                    Text("Match:")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Picker("", selection: Binding(
                        get: { cfg.matchAll },
                        set: { val in
                            var c = settings.config(for: def.id)
                            c.matchAll = val
                            settings.setConfig(c, for: def.id)
                        }
                    )) {
                        Text("Any").tag(false)
                        Text("All").tag(true)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 110)
                    Spacer()
                    if settings.isCustomized(for: def.id) {
                        Button("Reset") {
                            settings.resetToDefault(for: def.id)
                            if addingTo == def.id { addingTo = nil }
                            if editingTarget?.defId == def.id { editingTarget = nil }
                        }
                        .font(.caption)
                        .buttonStyle(.plain)
                        .foregroundStyle(.secondary)
                    }
                }

                // Phrase list
                ForEach(Array(cfg.phrases.enumerated()), id: \.offset) { index, phrase in
                    let target = EditingTarget(defId: def.id, index: index)
                    if editingTarget == target {
                        // Inline editor
                        HStack(spacing: 6) {
                            TextField("Phrase…", text: $editDraft)
                                .textFieldStyle(.roundedBorder)
                                .controlSize(.small)
                                .frame(maxWidth: 250)
                                .onSubmit { commitEdit(for: def.id, at: index) }
                            Button {
                                commitEdit(for: def.id, at: index)
                            } label: {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            }
                            .buttonStyle(.plain)
                            .help("Save")
                            Button {
                                editingTarget = nil
                                editDraft = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                            .help("Cancel")
                        }
                    } else {
                        // Phrase chip — click to edit
                        HStack(spacing: 6) {
                            Text(phrase)
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(Color.secondary.opacity(0.10)))
                                .contentShape(Capsule())
                                .onTapGesture {
                                    addingTo = nil
                                    draftPhrase = ""
                                    editingTarget = target
                                    editDraft = phrase
                                }
                                .help("Click to edit")
                            Button {
                                var c = settings.config(for: def.id)
                                c.phrases.remove(at: index)
                                settings.setConfig(c, for: def.id)
                                if editingTarget == target { editingTarget = nil }
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                            .buttonStyle(.plain)
                            .help("Remove phrase")
                        }
                    }
                }

                // Add new phrase
                if addingTo == def.id {
                    HStack(spacing: 6) {
                        TextField("New phrase…", text: $draftPhrase)
                            .textFieldStyle(.roundedBorder)
                            .controlSize(.small)
                            .frame(maxWidth: 250)
                            .onSubmit { commitAdd(for: def.id) }
                        Button("Add") { commitAdd(for: def.id) }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                        Button("Cancel") {
                            addingTo = nil
                            draftPhrase = ""
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                } else {
                    Button {
                        editingTarget = nil
                        editDraft = ""
                        addingTo = def.id
                        draftPhrase = ""
                    } label: {
                        Label("Add phrase", systemImage: "plus")
                            .font(.caption)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Color.accentColor)
                }

                // Contextual hint
                if def.namePlaceholderHint && def.victimPlaceholderHint {
                    Text("{name} and {victim} are substituted with the two players' names at match time.")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                } else if def.namePlaceholderHint {
                    Text("{name} is substituted with the player's name at match time.")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                } else if def.requiresPlayerName {
                    Text("Player name must also appear in the notes.")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)

            Spacer(minLength: 0)
        }
    }

    // MARK: - Badge icon

    private func badgeIcon(_ def: AchievementTriggerSettings.TriggerDef) -> some View {
        let badge: Achievement = {
            switch def.id {
            case "nice":
                return Achievement(id: def.id, title: def.title, description: "", progress: "",
                                   display: .tintedNumber(69, Color(red: 0.40, green: 0.75, blue: 0.45)),
                                   tint: .clear, isEarned: true)
            case "noah-matthew":
                return Achievement(id: def.id, title: def.title, description: "", progress: "",
                                   display: .overlayIcon("hand.thumbsup.fill", "nosign"),
                                   tint: Color(red: 0.55, green: 0.65, blue: 0.90), isEarned: true)
            default:
                return Achievement(id: def.id, title: def.title, description: "", progress: "",
                                   display: .icon(def.icon), tint: def.tint, isEarned: true)
            }
        }()
        return AchievementBadge(achievement: badge)
    }

    // MARK: - Web Export

    private var webExportSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Web Export")
                        .font(.subheadline.weight(.semibold))
                    Text("Export all pod data to your local GitHub repo and push to GitHub so Vercel rebuilds the site.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            HStack(spacing: 8) {
                Text(repoPath.isEmpty ? "No repo selected" : repoPath)
                    .font(.caption)
                    .foregroundStyle(repoPath.isEmpty ? .tertiary : .secondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Button("Choose Repo…") {
                    let panel = NSOpenPanel()
                    panel.canChooseFiles = false
                    panel.canChooseDirectories = true
                    panel.allowsMultipleSelection = false
                    panel.prompt = "Select Repo"
                    if panel.runModal() == .OK, let url = panel.url {
                        repoPath = url.path
                        exportMessage = nil
                    }
                }
                .controlSize(.small)
            }

            HStack(spacing: 10) {
                Button {
                    runExport()
                } label: {
                    if isExporting {
                        HStack(spacing: 6) {
                            ProgressView().controlSize(.small)
                            Text("Exporting…")
                        }
                    } else {
                        Label("Export & Push to GitHub", systemImage: "paperplane.fill")
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.regular)
                .disabled(repoPath.isEmpty || isExporting)

                if let msg = exportMessage {
                    Text(msg)
                        .font(.caption)
                        .foregroundStyle(exportIsError ? .red : .green)
                        .lineLimit(2)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.secondary.opacity(0.04))
    }

    private func runExport() {
        guard !repoPath.isEmpty else { return }
        isExporting = true
        exportMessage = nil
        let ctx = modelContext
        let path = repoPath
        Task {
            do {
                try await WebExportService.exportAndPush(context: ctx, repoPath: path)
                await MainActor.run {
                    exportMessage = "Exported and pushed successfully."
                    exportIsError = false
                    isExporting = false
                }
            } catch {
                await MainActor.run {
                    exportMessage = error.localizedDescription
                    exportIsError = true
                    isExporting = false
                }
            }
        }
    }

    // MARK: - Import Games

    private var importGamesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Import Games")
                        .font(.subheadline.weight(.semibold))
                    Text("Import a game log file exported from the website's \"Log a Game\" page — for games logged while you weren't around to use the app directly.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            HStack(spacing: 10) {
                Button {
                    chooseImportFile()
                } label: {
                    Label("Choose File…", systemImage: "square.and.arrow.down")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.regular)

                if let msg = importMessage {
                    Text(msg)
                        .font(.caption)
                        .foregroundStyle(importIsError ? .red : .green)
                        .lineLimit(2)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.secondary.opacity(0.04))
    }

    private func chooseImportFile() {
        importMessage = nil
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [.json]
        panel.prompt = "Import"
        guard panel.runModal() == .OK, let url = panel.url else { return }

        do {
            let data = try Data(contentsOf: url)
            let file = try GameImportService.parse(data: data)
            pendingImportFile = file
            showImportPreview = true
        } catch {
            importMessage = error.localizedDescription
            importIsError = true
        }
    }

    private func commitImport(_ file: GameImportService.PendingGamesFile) {
        let count = GameImportService.importGames(file, into: modelContext)
        pendingImportFile = nil
        showImportPreview = false
        importMessage = "Imported \(count) game\(count == 1 ? "" : "s")."
        importIsError = false
        let ctx = modelContext
        Task { await PodStore.fetchMissingCardData(in: ctx) }
    }

    // MARK: - Actions

    private func commitAdd(for id: String) {
        let text = draftPhrase.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { addingTo = nil; return }
        var cfg = settings.config(for: id)
        if !cfg.phrases.contains(text) {
            cfg.phrases.append(text)
            settings.setConfig(cfg, for: id)
        }
        draftPhrase = ""
        addingTo = nil
    }

    private func commitEdit(for id: String, at index: Int) {
        let text = editDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { editingTarget = nil; return }
        var cfg = settings.config(for: id)
        guard index < cfg.phrases.count else { editingTarget = nil; return }
        cfg.phrases[index] = text
        settings.setConfig(cfg, for: id)
        editingTarget = nil
        editDraft = ""
    }
}

// MARK: - Import Preview Sheet

private struct ImportPreviewSheet: View {
    let file: GameImportService.PendingGamesFile
    let onCancel: () -> Void
    let onConfirm: () -> Void

    private var games: [GameImportService.PreviewGame] {
        GameImportService.preview(file)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Import \(games.count) Game\(games.count == 1 ? "" : "s")")
                        .font(.title3.bold())
                    Text("These will be added as new games. Players and commanders not already in your pod will be created automatically.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding()

            Divider()

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(games) { game in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: game.isInPerson ? "person.2.fill" : "wifi")
                                .foregroundStyle(.secondary)
                                .frame(width: 16)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(game.date, format: .dateTime.month().day().year().hour().minute())
                                    .font(.caption.weight(.semibold))
                                Text("\(game.winnerName) won · \(game.participantNames.joined(separator: ", "))")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.secondary.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }
                .padding()
            }

            Divider()

            HStack {
                Spacer()
                Button("Cancel", role: .cancel) { onCancel() }
                    .keyboardShortcut(.cancelAction)
                Button("Import \(games.count) Game\(games.count == 1 ? "" : "s")") { onConfirm() }
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(.defaultAction)
            }
            .padding()
        }
        .frame(width: 480, height: 500)
    }
}
