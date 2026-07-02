# Timer Keeper by dony.

[![English](https://img.shields.io/badge/Language-English-blue.svg)](README.md)
[![Español](https://img.shields.io/badge/Idioma-Español-red.svg)](README_ES.md)
[![Version](https://img.shields.io/badge/version-4.0.0-white.svg)](CHANGELOG.md)
[![After Effects](https://img.shields.io/badge/After%20Effects-2022%2B-9999ff.svg)](#compatibility)
[![CEP](https://img.shields.io/badge/CEP-11-555.svg)](#compatibility)
[![Stack](https://img.shields.io/badge/React%2019%20·%20TypeScript%20·%20Vite-1e1e1e.svg)](#tech-stack)
[![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey.svg)](LICENSE)

> **[Leer en Español](README_ES.md) | Read in English**

## Description
Timer Keeper is an Adobe After Effects extension that tracks the time you spend on each project. It watches which project is open, keeps a per-project (and per-day) log of accumulated time, and gives you a monochrome dashboard to see where your hours actually went — no manual stopwatch, no spreadsheets.

Formerly distributed as "AE TimerKeeper", the extension has been rebuilt from the ground up as **Timer Keeper**.

## Current Version
**v4.0.0** - Complete rewrite: migrated to a modern, modular architecture (React + TypeScript, bundled with Vite), a new monochrome "instrument" design, real per-day time tracking, and several v3 bugs fixed. See [CHANGELOG.md](CHANGELOG.md).

## What's New in v4.0.0
- **Rebuilt from the ground up** on a modular React + TypeScript codebase (bundled with Vite), replacing the previous single-file panel — easier to maintain and extend.
- **Rebranded**: "AE TimerKeeper" is now **Timer Keeper**, with a new extension ID and panel name.
- **Monochrome "instrument" UI**: no color accents — state is shown through icon, luminance, and subtle motion (a pulsing colon while the timer runs, an animating Start/Pause key).
- **Real "Today" tracking**: the Dashboard's daily total now reflects actual time logged today (previously a hardcoded placeholder), backed by a new per-day data schema.
- **Dashboard redesigned**: the colored donut chart was replaced with a monochrome horizontal bar distribution, plus stat cards and a Top 5 / All toggle.
- **Bug fixes carried over from v3**: the time-format toggle no longer crashes, the flyout menu no longer runs actions twice, toast notifications no longer double-fire or use the wrong style, and the host/panel time formatting is unified into a single implementation.
- **Fully offline**: fonts (Google Sans Flex) and icons (Material Symbols) are bundled locally — no CDN requests.
- **Updated compatibility:** now targets After Effects 2022 (22.0) and newer.

## Installation

### For users (prebuilt extension)
1. Locate the Adobe After Effects CEP Extensions folder:
   ```
   C:\Program Files (x86)\Common Files\Adobe\CEP\extensions
   ```
   (or, per user: `%APPDATA%\Adobe\CEP\extensions`)
2. Place the entire built extension folder (`com.donyaep.TimerKeeper`) in this directory.
3. Launch After Effects and open the extension via **Window > Extensions > Timer Keeper**.

> If you previously installed "AE TimerKeeper" (`com.dony.aetimerkeeper`), remove it from both CEP extensions folders — the new extension uses a different ID and is treated as a separate install. Your tracked time is not lost: it lives in `Documents/Adobe/TimerData/` and is migrated automatically on first load.

> Unsigned development builds require enabling CEP debug mode once:
> ```
> reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
> ```

### For developers (build from source)
Requires **Node.js 20.19+ or 22.12+** (Vite 8 requirement).

```bash
npm install        # install dependencies
npm run dev        # start the Vite dev server (browser preview)
npm run build      # type-check + production build to dist/
npm run deploy     # build + copy to %APPDATA%\Adobe\CEP\extensions (local install)
npm run package    # build + zip dist/ into releases/ for distribution
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

## Main Features
- **Real-time tracking:** start/pause the timer for the current project with a single click; time is saved continuously while it runs (autosave every 5 s, and on pause/close).
- **Automatic project detection:** pauses the previous project and auto-starts the newly opened one if it already has tracked time; preventive pause for unsaved or version-converting projects.
- **Project list:** search by name, double-click to open a project (and start timing it), delete a project and its data, refresh from disk.
- **Reset:** clear the accumulated time for the selected project (with confirmation).
- **Time format toggle:** switch between `HH:MM:SS` and a descriptive duration format.
- **Dashboard:** total time tracked, today's time (real, per calendar day), project count, and a monochrome horizontal bar distribution with a Top 5 / All toggle.
- **Help modal:** usage guide, "Open Data Location" shortcut, and a contact/documentation link.
- **Toast notifications** for warnings (e.g. "pause before resetting") and confirmations.
- **Flyout menu:** refresh and open documentation, directly from the panel's menu.

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
5. **Help:** click the help icon in the footer for a usage guide, quick access to your data file's folder, and support/documentation links.
6. **Flyout menu:** open the panel's menu (top-right) to refresh the project list or open the online documentation.

## Data
Timer data is stored as JSON in `Documents/Adobe/TimerData/timerData.json`, written atomically (temp file + rename) by the ExtendScript host. Older formats from previous versions are detected and migrated automatically the first time you open the extension, with a backup copy written before the migration.

## Version History
For detailed version history and changelog, please see [CHANGELOG.md](CHANGELOG.md).

## Support
For help or to provide feedback, please contact me at:
[https://donyaep.vercel.app/](https://donyaep.vercel.app/)

Enjoy the extension and stay on top of your project time!
