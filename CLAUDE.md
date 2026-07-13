# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A macOS SwiftUI/SwiftData app for tracking Magic: The Gathering Commander pod games (players, commanders, games, win/loss stats, achievements), plus a companion Next.js website that publishes a read-only export of the same data.

## Commands

There is no CLI build/test workflow — this is an Xcode project with a single app target and no test target.

- Build/run: open `Commander.xcodeproj` in Xcode and run the "Commander (macOS)" scheme, or from the CLI:
  ```
  xcodebuild -project Commander.xcodeproj -scheme "Commander (macOS)" build
  ```
- Website (`website/`, a separate Next.js 14 + TypeScript + Tailwind app deployed to Vercel with `rootDirectory: website`):
  ```
  cd website
  npm run dev      # local dev server
  npm run build    # production build (also validates types)
  ```
  No lint/test scripts are defined in `website/package.json`.

## Architecture

### macOS app (`macOS (App)/`, `Shared (App)/`)

SwiftData is the persistence layer; models live in `Models.swift`:
- `Player` — has-many `GameParticipant` via `participations`.
- `MTGCommander` — has-many `GameParticipant` via both `participations` (primary commander) and `partnerParticipations` (partner commander in a partner/background pairing). `allParticipations` merges both.
- `Game` — has-many `GameParticipant` (cascade delete).
- `GameParticipant` — the join entity carrying per-game state: win/placement/turn order/opening hand size, and `chosenColorIdentity` for commanders whose color identity varies per game (see `variableIdentityCommanderNames` in `Models.swift`).
- `PodStore` (enum in `Models.swift`) is the data-access/migration helper: find-or-create lookups (case-insensitive name matching) and one-shot backfills that repair SwiftData's zero-value defaults after lightweight migrations (`turnOrder` and `openingHandSize` both need 0 → sentinel/default backfills — see the comments in `Models.swift` for why).

View structure fans out from `ContentView.swift`: three top-level destinations (`PlayersView`, `CommandersView`, `AnnalsView` — the last defined inside `GamesView.swift`) plus a `SettingsView` sheet. `GamesView.swift` is the largest/most central view (pod entry, game history, achievement triggers on save).

`Achievements.swift` is the achievement engine: an `Achievement` model struct with a `Display` enum describing how each badge renders, `computeAchievementContext` (derives pod-wide superlatives like quickest win/longest game from all games), and catalog/earned-achievement computation functions consumed both by in-app views and by `WebExportService` for the website export. `AchievementTriggerSettings.swift` holds user-configurable thresholds for triggering achievements.

`WebExportService.swift` serializes the SwiftData store into a versioned JSON shape (`ExportData`/`PlayerData`/`CommanderData`/`GameData`/`ParticipantData`/`AchievementData`) mirrored by `website/src/lib/types.ts`, writes it to `website/public/data/export.json` inside a chosen local repo checkout, then shells out to `git add`/`commit`/`push` to publish it. This is the sole integration point between the two halves of the repo — **if you change the shape of any `WebExportService` Codable struct, update `website/src/lib/types.ts` to match.** The repo path is stored in `@AppStorage("webExportRepoPath")` and configured from `SettingsView`.

`ScryfallService.swift` fetches commander color identity and card images from the Scryfall API to fill in `MTGCommander.colorIdentity`/`imageURLs` when missing.

### Website (`website/`)

Next.js App Router site, statically reading `website/public/data/export.json` at build/request time via `src/lib/data.ts` (`loadData`, cached, falls back to an empty `ExportData` if the file is missing/unparseable). Routes under `src/app/`: home (`page.tsx`), `players/` and `players/[name]/`, `commanders/` and `commanders/[name]/`, `annals/` (game log). Shared UI in `src/components/` (`Nav`, `ColorDots`, `AchievementPill`). `src/lib/types.ts` is the TypeScript mirror of the Swift export structs — the two must be kept in sync by hand.

Deployed via Vercel (`vercel.json` at repo root sets `rootDirectory: website`).
