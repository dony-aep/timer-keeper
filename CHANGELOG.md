# Changelog

All notable changes to Timer Keeper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-07-01

### Added
- **Update notifications**: the panel checks the GitHub Releases API (automatically at most once a day, or on demand via the new "Check for Updates" flyout action) and shows an "Update vX.Y.Z" link in the footer when a newer version is published. Fails silently offline — the panel never depends on the network.

### Changed
- **Complete rewrite**: rebuilt from a single vanilla-JS CEP extension into a modular React 19 + TypeScript + Vite codebase, following the same architecture as Layers Pane Plus v4.
- **Rebranded to "Timer Keeper"**: the extension is no longer called "AE TimerKeeper" — new display name, new bundle/extension ID (`com.donyaep.TimerKeeper`), new panel folder. Previous installs (`com.dony.aetimerkeeper`) should be removed manually; existing tracked time is preserved automatically (see Data below).
- **New monochrome "instrument" design**: strict grayscale palette, Google Sans Flex throughout with tabular numerals for the timer display, Material Symbols Outlined icons — no color accents; state is communicated through luminance and motion instead of hue.
- **Dashboard redesigned**: the colored donut chart was replaced with a monochrome horizontal bar distribution (bar length only, no per-project colors), alongside stat cards and a Top 5 / All toggle.
- Minimum supported version raised to **After Effects 2022 (22.0) / CEP 11**, required by the modern UI stack.
- Fonts and icons are bundled locally (no Google Fonts CDN) — the panel now works fully offline.

### Fixed
- **Time format toggle crash**: `toggleTimeFormat()` referenced a non-existent variable and broke the display at runtime — rewritten with a single source of truth.
- **Fake "Today" stat**: the Dashboard's "Today" value was a hardcoded `totalSeconds * 0.3` placeholder. It's now backed by real per-day tracking (data schema v2), accumulated as you work and reset at midnight.
- **Duplicate flyout menu execution**: the flyout menu handler was registered twice, causing every menu action to run twice.
- **Duplicate toast close handler**: the toast close button had two click listeners attached.
- **Wrong toast type on delete**: deleting a project showed an `error`-styled toast for what is a successful action.
- Removed dead code (a permanently hidden day counter).
- Unified `formatTime` into a single, tested TypeScript implementation (previously duplicated between the panel and the ExtendScript host, risking divergence).
- Replaced the chained per-tick `evalScript` calls (up to 4 per poll) with a single `getSnapshot()` host call, removing a race-condition-prone callback pattern.

### Data
- New on-disk schema (v2) adds real per-project, per-day time buckets. Existing v1 (`{Projects:[...]}`) and legacy (`{path: seconds}`) data files are migrated automatically on first load, with a `timerData.v1.backup.json` safety copy written before the first v2 save. The data file location is unchanged (`Documents/Adobe/TimerData/`).

## [3.0.0] - 2025-04-07

### Added
- **Complete rebuild as an Adobe CEP Extension**, replacing the ExtendScript ScriptUI panel with a persistent HTML/JS/CSS panel.
- **Analytics Dashboard**: time distribution donut chart, top-projects view with progress indicators, toggle between top and all projects.
- Tab-based navigation between the Timer and Dashboard.
- Toast notification system for user feedback.
- Real-time project search/filtering.
- Detection of unsaved and version-converting projects, with preventive pausing.

### Changed
- Improved visual design with better spacing, typography, and color scheme.
- Responsive layout that adapts to different panel sizes.

## [2.1.0] - 2025-02-14

### Changed
- Timer data JSON moved from the Desktop to `Documents/Adobe/TimerData` (existing Desktop files migrated automatically).
- Redesigned Help panel: version header, better section organization, and a "Contact Me" panel with a copyable link.

### Fixed
- Help copy now advises manually pausing the timer before switching or starting a new project.

## [2.0.0] - 2024

### Added
- Three-panel layout (header, main, footer) with a persistent status message area.
- Project validation and improved project-switching handling.
- Tooltips across all major UI elements.

## [1.1.0] - 2024

### Added
- **Refresh** button to manually reload timer data from disk.
- Double-click to open a project from the Recent Projects list.
- Temp-file-then-rename saving to reduce the risk of data corruption.

### Fixed
- Script no longer freezes when adding projects not previously stored.
- Modal-dialog guards to avoid conflicts with concurrent script execution.

## [1.0.0] - 2023

### Added
- Initial release: start/pause/reset timer per project, recent-projects list with persistent storage, automatic project-switch monitoring, and a built-in help panel.
