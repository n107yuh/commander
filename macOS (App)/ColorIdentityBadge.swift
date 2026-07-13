//
//  ColorIdentityBadge.swift
//  Commander (macOS)
//

import SwiftUI

struct ColorIdentityBadge: View {
    let colors: [String]?
    var dotSize: CGFloat = 12

    var body: some View {
        if let colors, !colors.isEmpty {
            HStack(spacing: 3) {
                ForEach(colors, id: \.self) { c in
                    Circle()
                        .fill(Self.color(for: c))
                        .overlay(
                            Circle().stroke(Color.secondary.opacity(0.4), lineWidth: 0.5)
                        )
                        .frame(width: dotSize, height: dotSize)
                }
            }
        } else if colors != nil {
            Text("Colorless")
                .font(.caption2)
                .foregroundStyle(.secondary)
        } else {
            Text("—")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    static func color(for symbol: String) -> Color {
        switch symbol {
        case "W": return Color(red: 0.97, green: 0.93, blue: 0.78)
        case "U": return Color(red: 0.30, green: 0.55, blue: 0.85)
        case "B": return Color(red: 0.20, green: 0.20, blue: 0.22)
        case "R": return Color(red: 0.85, green: 0.35, blue: 0.30)
        case "G": return Color(red: 0.25, green: 0.60, blue: 0.35)
        default:  return Color.gray
        }
    }
}
