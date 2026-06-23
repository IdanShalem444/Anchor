# Anchor — Desktop app

A native desktop wrapper around the live Anchor web app. It adds:

- A real app window (and a true browser engine, so the in-app "Live" research view works fully)
- **Native OS notifications** for reminders (due today / overdue)
- A **menu-bar / tray** presence — quick open, and an always-on-top **reminders widget**
- **Open at login** toggle
- Runs in the background (closing the window hides it to the tray; Quit from the tray menu)

It loads `https://anchor-seven-lyart.vercel.app`, so it always runs the latest version and shares your account + data with the website.

---

## Run it now (from this folder)

```bash
cd desktop
npm install      # downloads Electron (~150 MB, one time)
npm start
```

Dev against a local web build: `ANCHOR_URL=http://localhost:3000 npm start`

## Let other people install it from the terminal

This gives friends the real **Anchor.app** (proper name + icon) with one command.
It works by downloading the latest build from your **GitHub Releases**, so you
publish once and anyone can install.

**You (one-time per version):**

```bash
# 1. Build the distributable (.dmg + .zip)
cd desktop && npm run dist:mac      # → desktop/dist/Anchor-<ver>-arm64-mac.zip

# 2. Push this repo to GitHub (creates github.com/<you>/anchor)
#    Then create a Release and attach the .zip — via the GitHub website
#    (Releases → Draft new release → attach the zip), or with the gh CLI:
gh release create v0.1.0 desktop/dist/Anchor-*-mac.zip -t "Anchor 0.1.0"
```

**Them (any Mac, one line):**

```bash
curl -fsSL https://raw.githubusercontent.com/IdanShalem444/Anchor/main/desktop/scripts/install.sh | bash
```

That downloads Anchor, installs it to `~/Applications`, clears the Gatekeeper
quarantine, and launches it. (The script defaults to owner `IdanShalem444`,
repo `anchor`; override with `ANCHOR_OWNER` / `ANCHOR_REPO`, or edit the
defaults at the top of `scripts/install.sh`.)

> **Apple Silicon vs Intel:** `npm run dist:mac` builds for your Mac's chip
> (arm64 here). For Intel friends add an x64 build, or build universal.

### Alternative: npm global install (gives the dev "Electron" look)

You can instead publish to npm so people run `npm install -g anchor-study-desktop && anchor`.
Downside: it launches the raw Electron binary (shows as "Electron", default icon,
~150 MB per install) — the GitHub-release route above is the better experience.
For this route, move `electron` back to `dependencies` in `package.json`.

## Build installers (.dmg / .exe / AppImage)

```bash
npm run dist          # current OS
npm run dist:mac      # macOS .dmg + .zip
npm run dist:win      # Windows .exe (NSIS)
npm run dist:linux    # Linux AppImage
```

Output lands in `desktop/dist/`. These are double-click installers you can host
on a GitHub Release for non-terminal users.

### Notes / next steps
- **Icons:** add `assets/icon.png` (512×512) and `assets/trayTemplate.png`
  (small, black-on-transparent for macOS menu bar). Without them, Electron's
  default icon is used.
- **Code signing / notarization:** unsigned builds trigger an "unidentified
  developer" warning on macOS/Windows. For a clean install on any laptop you'll
  need an Apple Developer cert (macOS notarization) and/or a Windows code-signing
  cert. Configure them in `package.json` → `build`.
- **Auto-update:** can be added later with `electron-updater` + GitHub Releases.
