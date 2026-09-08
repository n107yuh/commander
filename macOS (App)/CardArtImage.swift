//
//  CardArtImage.swift
//  Commander (macOS)
//

import SwiftUI

/// Loads a card image over the network without going through `URLCache`. Plain SwiftUI
/// `AsyncImage` uses `URLSession.shared`'s default (disk-backed, persists across launches) cache
/// with no way to opt out — if a request ever gets a bad response cached under a card's URL (e.g.
/// during a burst of Scryfall requests that got rate-limited), AsyncImage keeps replaying that
/// failure indefinitely afterward, even once the underlying image is fine again and even across
/// app relaunches. This always hits the network fresh instead.
struct CardArtImage<Failure: View>: View {
    let urlString: String
    let cardWidth: CGFloat
    @ViewBuilder let failureView: () -> Failure

    @State private var image: NSImage?
    @State private var failed = false

    var body: some View {
        Group {
            if let image {
                Image(nsImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else if failed {
                failureView()
            } else {
                ProgressView()
                    .frame(width: cardWidth, height: cardWidth / 0.72)
            }
        }
        .task(id: urlString) {
            image = nil
            failed = false
            await load()
        }
    }

    private func load() async {
        guard let url = URL(string: urlString) else {
            failed = true
            return
        }
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
                  let loaded = NSImage(data: data) else {
                failed = true
                return
            }
            image = loaded
        } catch {
            failed = true
        }
    }
}
