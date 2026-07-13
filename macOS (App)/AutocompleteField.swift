//
//  AutocompleteField.swift
//  Commander (macOS)
//

import SwiftUI

struct AutocompleteField: View {
    let title: String
    @Binding var text: String
    let suggestionsProvider: (String) async -> [String]

    @State private var suggestions: [String] = []
    @State private var searchTask: Task<Void, Never>?
    @State private var suppressNextSearch = false
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            TextField("", text: $text, prompt: Text(title))
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.leading)
                .labelsHidden()
                .focused($isFocused)
                .onChange(of: text) { _, newValue in
                    if suppressNextSearch {
                        suppressNextSearch = false
                        suggestions = []
                        return
                    }
                    triggerSearch(newValue)
                }
                .onSubmit { suggestions = [] }

            if isFocused && !suggestions.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(suggestions, id: \.self) { suggestion in
                            Button {
                                suppressNextSearch = true
                                text = suggestion
                            } label: {
                                Text(suggestion)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.secondary.opacity(0.18))
                                    .clipShape(Capsule())
                                    .lineLimit(1)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 2)
                }
                .frame(maxHeight: 32)
            }
        }
    }

    private func triggerSearch(_ query: String) {
        searchTask?.cancel()
        let snapshot = query
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 250_000_000)
            if Task.isCancelled { return }
            let results = await suggestionsProvider(snapshot)
            if Task.isCancelled { return }
            if results.count == 1, results.first?.caseInsensitiveCompare(snapshot) == .orderedSame {
                suggestions = []
            } else {
                suggestions = results
            }
        }
    }
}
