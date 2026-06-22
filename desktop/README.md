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

## Install as a terminal command (`anchor`)

After `npm install` in this folder:

```bash
npm install -g .     # registers the `anchor` command on this machine
anchor               # launches the app
```

To make it installable on **any** laptop with one command, publish it to npm
(needs your own npm account — `npm login`), then anyone can run:

```bash
npm install -g anchor-study-desktop
anchor
```

> Pick a unique package `name` in `package.json` before publishing if
> `anchor-study-desktop` is taken.

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
