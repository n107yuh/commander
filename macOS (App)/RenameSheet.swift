//
//  RenameSheet.swift
//  Commander (macOS)
//

import SwiftUI

enum RenameKind {
    case player
    case commander

    var title: String {
        switch self {
        case .player: return "Rename Player"
        case .commander: return "Rename Commander"
        }
    }

    var placeholder: String {
        switch self {
        case .player: return "Player name"
        case .commander: return "Commander name"
        }
    }
}

struct RenameSheet: View {
    @Environment(\.dismiss) private var dismiss

    let kind: RenameKind
    let originalName: String
    let isNameTaken: (String) -> Bool
    let onSave: (String) -> Void

    @State private var newName: String = ""
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(kind.title)
                .font(.title2.bold())

            Group {
                switch kind {
                case .player:
                    TextField(kind.placeholder, text: $newName)
                        .textFieldStyle(.roundedBorder)
                case .commander:
                    AutocompleteField(
                        title: kind.placeholder,
                        text: $newName,
                        suggestionsProvider: { query in
                            await ScryfallService.autocomplete(query: query)
                        }
                    )
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            HStack {
                Button("Cancel", role: .cancel) { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Spacer()
                Button("Save") { save() }
                    .keyboardShortcut(.defaultAction)
                    .disabled(trimmed.isEmpty || trimmed == originalName)
            }
        }
        .padding()
        .frame(minWidth: 380)
        .onAppear { newName = originalName }
    }

    private var trimmed: String {
        newName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func save() {
        let name = trimmed
        guard !name.isEmpty, name != originalName else { return }
        if isNameTaken(name) {
            errorMessage = "Another entry already uses this name."
            return
        }
        onSave(name)
        dismiss()
    }
}
