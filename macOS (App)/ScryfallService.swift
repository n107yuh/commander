//
//  ScryfallService.swift
//  Commander (macOS)
//

import Foundation

struct ScryfallCardInfo {
    let name: String
    let colorIdentity: [String]
    let imageURLs: [String]
}

/// Serializes every outgoing Scryfall request behind a small minimum spacing. Scryfall asks
/// integrations to stay under ~10 requests/second with 50-100ms between requests; the app now has
/// several call sites that can plausibly fire near-simultaneously (autocomplete-as-you-type,
/// per-commander background color/image backfill, and the live per-row "is this resolvable"
/// check added for the color-identity-override feature — opening an editor with several
/// already-typed commanders can trigger a handful of lookups within the same instant). Without
/// this, a burst risks a 429 or throttling that — if Scryfall's API and its image CDN share
/// rate-limiting infrastructure, which is plausible since both are scryfall.io/.com — could show up
/// as card art failing to load even though the specific image URL is fine on its own.
private actor ScryfallRateLimiter {
    private var lastRequestFinished: Date = .distantPast
    private let minInterval: TimeInterval = 0.12

    func waitTurn() async {
        let elapsed = Date().timeIntervalSince(lastRequestFinished)
        if elapsed < minInterval {
            try? await Task.sleep(nanoseconds: UInt64((minInterval - elapsed) * 1_000_000_000))
        }
        lastRequestFinished = Date()
    }
}

enum ScryfallService {
    private static let rateLimiter = ScryfallRateLimiter()

    static func autocomplete(query: String) async -> [String] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else { return [] }

        // Hand-maintained names Scryfall's live is:commander search wouldn't otherwise surface
        // come first, so a real card the pod plays isn't crowded out of the visible list by
        // Scryfall's 20-result cap.
        let extraMatches = extraKnownCommanderNames.filter {
            $0.range(of: trimmed, options: .caseInsensitive) != nil
        }

        let scryfallQuery = "is:commander name:\(trimmed)"

        var components = URLComponents(string: "https://api.scryfall.com/cards/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: scryfallQuery),
            URLQueryItem(name: "unique", value: "cards"),
            URLQueryItem(name: "order", value: "name"),
        ]
        guard let url = components.url else { return extraMatches }

        await rateLimiter.waitTurn()
        do {
            let (data, _) = try await URLSession.shared.data(for: makeRequest(url: url))
            let response = try JSONDecoder().decode(SearchResponse.self, from: data)
            var seen = Set(extraMatches.map { $0.lowercased() })
            var names = extraMatches
            for card in response.data {
                if seen.insert(card.name.lowercased()).inserted {
                    names.append(card.name)
                    if names.count >= 20 { break }
                }
            }
            return names
        } catch {
            return extraMatches
        }
    }

    /// Looks up a single card by name, tolerantly: uses Scryfall's *fuzzy* named-card endpoint
    /// rather than an exact match, since fuzzy already searches a card's printed/flavor name (the
    /// text actually on a Universes Beyond/Secret Lair crossover treatment) as well as its real
    /// Oracle name — e.g. "Dhalsim, Pliable Pacifist" and "Lightning, Lone Commando" both resolve
    /// correctly with no per-card name mapping needed. It also tolerates minor typos and still
    /// 404s on a genuinely unrecognized or ambiguous name rather than guessing wildly.
    static func fetchCard(named exactName: String) async -> ScryfallCardInfo? {
        let trimmed = exactName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        var components = URLComponents(string: "https://api.scryfall.com/cards/named")!
        components.queryItems = [URLQueryItem(name: "fuzzy", value: trimmed)]
        guard let url = components.url else { return nil }

        await rateLimiter.waitTurn()
        do {
            let (data, _) = try await URLSession.shared.data(for: makeRequest(url: url))
            let card = try JSONDecoder().decode(NamedCardResponse.self, from: data)

            let faceImages: [String] = (card.card_faces ?? []).compactMap { face in
                face.image_uris?.normal ?? face.image_uris?.large
            }
            let imageURLs: [String]
            if !faceImages.isEmpty {
                imageURLs = faceImages
            } else if let top = card.image_uris?.normal ?? card.image_uris?.large {
                imageURLs = [top]
            } else {
                imageURLs = []
            }

            return ScryfallCardInfo(
                name: card.name,
                colorIdentity: card.color_identity,
                imageURLs: imageURLs
            )
        } catch {
            return nil
        }
    }

    private static func makeRequest(url: URL) -> URLRequest {
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("CommanderTracker/1.0", forHTTPHeaderField: "User-Agent")
        return request
    }

    private struct SearchResponse: Decodable {
        let data: [Card]

        struct Card: Decodable {
            let name: String
        }
    }

    private struct NamedCardResponse: Decodable {
        let name: String
        let color_identity: [String]
        let image_uris: ImageURIs?
        let card_faces: [CardFace]?
    }

    private struct ImageURIs: Decodable {
        let normal: String?
        let large: String?
    }

    private struct CardFace: Decodable {
        let image_uris: ImageURIs?
    }
}
