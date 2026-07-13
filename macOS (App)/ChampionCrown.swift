//
//  ChampionCrown.swift
//  Commander (macOS)
//

import SwiftUI

enum ChampionCrownStyle {
    case blue
    case silver
    case rainbow
}

struct ChampionCrown: View {
    let style: ChampionCrownStyle
    var font: Font = .body

    var body: some View {
        switch style {
        case .rainbow:
            TimelineView(.animation(minimumInterval: 0.04)) { timeline in
                let t = timeline.date.timeIntervalSince1970
                let hue = (t / 2.5).truncatingRemainder(dividingBy: 1.0)
                Image(systemName: "crown.fill")
                    .font(font)
                    .foregroundStyle(
                        AngularGradient(
                            gradient: Gradient(colors: Self.rainbowColors),
                            center: .center,
                            angle: .degrees(hue * 360)
                        )
                    )
            }
        case .blue:
            Image(systemName: "crown.fill")
                .font(font)
                .foregroundStyle(Color(red: 0.35, green: 0.55, blue: 0.95))
        case .silver:
            Image(systemName: "crown.fill")
                .font(font)
                .foregroundStyle(Color(red: 0.78, green: 0.80, blue: 0.85))
        }
    }

    static let rainbowColors: [Color] = [.red, .orange, .yellow, .green, .blue, .indigo, .purple, .red]

    /// Helper that returns the appropriate style for a participant who tops
    /// remote, in-person, or both leaderboards. Returns nil if neither.
    static func style(isRemoteLeader: Bool, isInPersonLeader: Bool) -> ChampionCrownStyle? {
        switch (isRemoteLeader, isInPersonLeader) {
        case (true, true): return .rainbow
        case (true, false): return .blue
        case (false, true): return .silver
        case (false, false): return nil
        }
    }
}
