//
//  SettingsView.swift
//  Commander (macOS)
//

import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    private let settings = AchievementTriggerSettings.shared

    @State private var addingTo: String? = nil
    @State private var draftPhrase: String = ""
    @State private var editingTarget: EditingTarget? = nil
    @State private var editDraft: String = ""

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
        }
        .frame(width: 680, height: 580)
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
                if def.namePlaceholderHint {
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
