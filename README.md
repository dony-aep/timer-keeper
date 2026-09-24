# Timer Keeper by dony.

[![English](https://img.shields.io/badge/Language-English-blue.svg)](README.md)
[![Español](https://img.shields.io/badge/Idioma-Español-red.svg)](README_ES.md)
[![Version](https://img.shields.io/badge/version-4.2.0-white.svg)](CHANGELOG.md)
[![After Effects](https://img.shields.io/badge/After%20Effects-2022%2B-9999ff.svg)](#compatibility)
[![CEP](https://img.shields.io/badge/CEP-11-555.svg)](#compatibility)
[![Stack](https://img.shields.io/badge/React%2019%20·%20TypeScript%20·%20Vite-1e1e1e.svg)](#tech-stack)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

> **[Leer en Español](README_ES.md) | Read in English**

## Description
Timer Keeper is an Adobe After Effects extension that tracks the time you spend on each project. It watches which project is open, keeps a per-project (and per-day) log of accumulated time, and gives you a monochrome dashboard to see where your hours actually went — no manual stopwatch, no spreadsheets.

Formerly distributed as "AE TimerKeeper", the extension has been rebuilt from the ground up as **Timer Keeper**.

## Current Version
**v4.2.0** - The timer can pause itself when you step away, projects can have their own colors in the Dashboard, and long times in text format no longer run off the panel. See [CHANGELOG.md](CHANGELOG.md).

## What's New in v4.2.0
- **Auto-pause when idle:** optional, off by default. After 5 to 30 minutes without keyboard or mouse activity the timer pauses, that idle time is not counted, and it resumes when you come back to the same project. Turn it on in the panel menu. After updating, restart After Effects once so the panel can read system activity.
- **Project colors:** click a project's swatch in the Dashboard legend to pick one of ten colors or any color with the picker.
- **Longer notifications:** they stay at least 8 seconds and do not close while the pointer is over them.
- **Fixed:** long times in the text format ("1 hrs, 7 mins, 44 secs") no longer spill past the timer card.

## Installation

### For users: quick install (recommended)
Each [release](https://github.com/dony-aep/timer-keeper/releases/latest) includes a signed `.zxp`. It needs no debug mode and no registry keys.

1. Download and install the free [ZXP/UXP Installer by aescripts + aeplugins](https://aescripts.com/learn/zxp-installer/) (Windows and macOS).
2. Download `timer-keeper-vX.Y.Z.zxp` from the latest release.
3. Close After Effects, then open the `.zxp` in the installer: drag it onto the window, or use **File > Open**.
4. Open After Effects and go to **Window > Extensions > Timer Keeper**.

> If the installer says no compatible application was found and marks After Effects as "Action required", Adobe's own installer needs the Creative Cloud desktop app running and signed in. You can still install without it: click **Install Anyway**. If that fails, open the installer's settings (gear icon), turn on **Install for current user only**, and install again.

### For users: manual install (zip)
1. Locate the Adobe After Effects CEP Extensions folder:
   - **Windows:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions` (or, per user: `%APPDATA%\Adobe\CEP\extensions`)
   - **macOS:** `/Library/Application Support/Adobe/CEP/extensions` (or, per user: `~/Library/Application Support/Adobe/CEP/extensions`)
2. Extract the release zip and copy the `com.donyaep.TimerKeeper` folder it contains into this directory.
3. Launch After Effects and open the extension via **Window > Extensions > Timer Keeper**.

> If you previously installed "AE TimerKeeper" (`com.dony.aetimerkeeper`), remove it from both CEP extensions folders — the new extension uses a different ID and is treated as a separate install. Your tracked time is not lost: it lives in `Documents/Adobe/TimerData/` and is migrated automatically on first load.

> Unsigned development builds require enabling CEP debug mode once. On Windows, double-click `Add Keys.reg`, included in the release zip, or run:
> ```
> reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
> ```
> On macOS, in Terminal:
> ```
> defaults write com.adobe.CSXS.11 PlayerDebugMode 1 && killall cfprefsd
> ```

### For developers (build from source)
Requires **Node.js 20.19+ or 22.12+** (Vite 8 requirement).

```bash
npm install        # install dependencies
npm run dev        # start the Vite dev server (browser preview)
npm run build      # type-check + production build to dist/
npm run deploy     # build + copy to %APPDATA%\Adobe\CEP\extensions (local install)
npm run package    # build + zip dist/ into releases/ for distribution
npm run icons      # regenerate the icon font after adding an icon to iconNames.ts
npm run sign       # build + signed .zxp in releases/ (needs ZXPSignCmd and a certificate)
```

After `npm run deploy`, restart After Effects to load the updated panel.

## Tech Stack
- **React 19** + **TypeScript** UI, bundled with **Vite** (`build.target: chrome88`).
- **react-aria-components** for accessible, keyboard-navigable controls.
- **CSS Modules** + design tokens (no Tailwind), monochrome "instrument" theme.
- Fonts/icons bundled locally (Google Sans Flex + Material Symbols Outlined subset) — offline-safe, no CDN.
- **ExtendScript** host logic (`public/jsx/hostscript.jsx`, namespaced under `$.global.TimerKeeper`) bridged to the UI via `CSInterface.evalScript`.

## Compatibility
| Requirement | Minimum |
|---|---|
| After Effects | 2022 (22.0) |
| CEP runtime | 11 (Chromium 88) |

> The floor was raised to After Effects 22.0 to match the rest of the current extension lineup and its modern UI stack.

> Tested on Windows 11 with After Effects 2026 and on macOS 12 Monterey with After Effects 2022.

## Main Features
- **Real-time tracking:** start/pause the timer for the current project with a single click; time is saved while it runs (every 30 s, and whenever you pause, switch projects or close the panel).
- **Automatic project detection:** pauses the previous project and auto-starts the newly opened one if it already has tracked time; preventive pause for unsaved or version-converting projects.
- **Project list:** search by name, double-click to open a project (and start timing it), delete a project and its data, refresh from disk.
- **Reset:** clear the accumulated time for the selected project (with confirmation).
- **Auto-pause when idle:** optional, off by default. Pauses the timer after 5 to 30 minutes without keyboard or mouse activity, removes that idle time, and resumes when you are back on the same project.
- **Time format toggle:** switch between `HH:MM:SS` and a descriptive duration format.
- **Dashboard:** total time tracked, today's time (real, per calendar day), project count, and a donut or horizontal bar distribution with a Top 5 / All toggle. Each project can have its own color.
- **Help modal:** usage guide, "Open Data Location" shortcut, and a contact/documentation link.
- **Toast notifications** for warnings (e.g. "pause before resetting") and confirmations.
- **Update notifications:** checks GitHub Releases (at most once a day) and shows a footer link when a newer version is available; a manual "Check for Updates" lives in the flyout menu. Fully silent offline.
- **Flyout menu:** refresh, check for updates, and open documentation, directly from the panel's menu.

## Usage
1. Open Adobe After Effects.
2. Go to **Window > Extensions > Timer Keeper**.
3. **Timer tab:**
   - Click **Start** to begin tracking the currently open project, **Pause** to stop.
   - Select a project in the list and click **Reset** to clear its time, or **Delete** to remove it (both require pausing the timer first).
   - Use the search field to filter the project list; double-click (or press Enter on) a project to open it in After Effects and start timing it.
   - Click the swap icon next to the time display to toggle between `HH:MM:SS` and a descriptive format.
4. **Dashboard tab:**
   - Review total time tracked, today's time, and the number of tracked projects.
   - Toggle between the **Top 5** and **All** projects in the distribution view.
   - Click a project's swatch in the donut legend to pick its color, or **Automatic** to go back to grey.
5. **Help:** click the help icon in the footer for a usage guide, quick access to your data file's folder, and support/documentation links.
6. **Flyout menu:** open the panel's menu (top-right) to refresh the project list, turn on **Auto-pause when idle**, or open the online documentation.

## Data
Timer data is stored as JSON in `Documents/Adobe/TimerData/timerData.json`, written by the panel through a temp file, keeping the previous version as `timerData.bak.json`. Older formats from previous versions are detected and migrated automatically the first time you open the extension, with a backup copy written before the migration.

## Version History
For detailed version history and changelog, please see [CHANGELOG.md](CHANGELOG.md).

## Support
For help or to provide feedback, please contact me at:
[https://donyaep.vercel.app/](https://donyaep.vercel.app/)

Enjoy the extension and stay on top of your project time!
