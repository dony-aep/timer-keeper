# Changelog

All notable changes to Timer Keeper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.2.0] - 2026-09-23

### Added
- **Auto-pause when idle**: if you leave the computer with the timer running, it can now pause itself after 5, 10, 15 or 30 minutes without keyboard or mouse activity, remove that idle time from the project, and resume when you come back to the same project. Choose the delay in the panel menu under **Auto-pause when idle**; it is off by default. A manual pause never resumes on its own.
- **Project colors**: in the Dashboard, click a project's swatch in the donut legend to give it a color, from ten presets or any color with the picker (color area, hue slider and hex field). The color shows in the donut and bar charts and is saved with your data; **Automatic** goes back to the default grey.

### Changed
- **Notifications stay longer**: they now stay on screen at least 8 seconds (up to 20 for long messages) and do not close while the pointer is over them. Moving the pointer away starts the countdown again, and the X closes them right away.

### Fixed
- **Text time format running off the panel**: long times such as "1 hrs, 7 mins, 44 secs" spilled past the edges of the timer card and under the format button. The text now wraps between units and fits even at the narrowest panel width.

## [4.1.0] - 2026-09-16

### Changed
- **Lighter autosave**: saving your time no longer runs inside After Effects. The panel writes the file itself every 30 seconds and whenever you pause, switch projects or close the panel, instead of asking After Effects to do it every 5 seconds.
- **Fewer requests to After Effects**: the panel checks which project is open every 5 seconds while timing and every 10 seconds while paused, instead of every 2 seconds, and checks right away when you click or move the mouse over the panel.
- **Less work while the timer runs**: the project list and the Dashboard chart now refresh each time your time is saved (every 30 seconds) instead of every second. The clock, the active project's row and the Total and Today figures still update every second.
- **Calmer running indicator**: the clock's colons now dim every other second instead of pulsing continuously, so the panel no longer redraws all the time while the timer runs.
- **Much smaller download**: the icon font now contains only the 23 icons the panel uses (about 7 KB instead of 4 MB), so the release zip shrinks and the panel has less to load when it opens.

### Fixed
- **Data file could be lost on a failed save**: if replacing the data file failed halfway, both the old and the new copy could be deleted. Saves now keep the previous version as `timerData.bak.json`, restore it when a save fails, and loading falls back to it.
- **Project detection could stop for the whole session**: if After Effects never answered one of the panel's checks, the panel stopped noticing project changes until it was reloaded. Checks now give up after 60 seconds and try again.
- **Two After Effects windows overwriting each other's time**: when two instances of After Effects track time at the same time (for example a release and a beta), each save now adds what the other one wrote instead of replacing it.
- **Sleep counted as work**: if the computer went to sleep with the timer running, the whole sleep time was added to the project when it woke up. Gaps longer than 5 minutes between timer updates are no longer counted, and the panel tells you when it skips one.

### Security
- **No remote debugging port in release builds**: the release zip no longer includes the `.debug` file, which opened a Chrome DevTools port (8090) on every install with debug mode turned on.

## [4.0.1] - 2026-09-10

### Changed
- **Simpler install**: the release zip now contains the `com.donyaep.TimerKeeper` folder, so installing is copying that folder into the CEP extensions directory.
- **Debug mode on Windows**: the release zip includes `Add Keys.reg`, which turns on `PlayerDebugMode` for CSXS 5 to 22 with a double click.

### Fixed
- **Empty panel on After Effects 2022 for macOS**: the panel opened empty because its code was loaded as an ES module, which the CEP 11 engine on macOS does not run from the extension folder. It now loads as a classic script.
- **Buttons and tabs not responding on macOS**: on After Effects 2022 for macOS, clicks reached the panel but no button, tab or list item reacted, because that engine does not send pointer events. The panel now derives them from mouse clicks, and stays out of the way where the engine already sends them (checked on After Effects 2026 for Windows).

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
