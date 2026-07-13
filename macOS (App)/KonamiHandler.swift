//
//  KonamiHandler.swift
//  Commander (macOS)
//

import Foundation
import Combine
import AppKit
import AVFoundation

@MainActor
final class KonamiHandler: ObservableObject {
    // ↑ ↑ ↓ ↓ ← → ← → B A Return  (macOS US key codes)
    private static let sequence: [UInt16] = [126, 126, 125, 125, 123, 124, 123, 124, 11, 0, 36]

    private var progress: Int = 0
    private var monitor: Any?
    private var player: AVAudioPlayer?

    func start() {
        guard monitor == nil else { return }
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handle(event.keyCode)
            return event
        }
    }

    func stop() {
        if let monitor {
            NSEvent.removeMonitor(monitor)
            self.monitor = nil
        }
        progress = 0
    }

    private func handle(_ keyCode: UInt16) {
        let target = Self.sequence
        if progress < target.count, keyCode == target[progress] {
            progress += 1
            if progress == target.count {
                toggleAudio()
                progress = 0
            }
        } else if keyCode == target[0] {
            progress = 1
        } else {
            progress = 0
        }
    }

    private func toggleAudio() {
        if let p = player, p.isPlaying {
            p.stop()
            player = nil
        } else {
            playAudio()
        }
    }

    private func playAudio() {
        guard let url = Bundle.main.url(forResource: "Deacon Blues", withExtension: "mp3") else {
            print("⚠️ Deacon Blues.mp3 not found in bundle")
            return
        }
        do {
            let p = try AVAudioPlayer(contentsOf: url)
            p.prepareToPlay()
            p.play()
            player = p
        } catch {
            print("⚠️ Failed to play audio: \(error)")
        }
    }
}
