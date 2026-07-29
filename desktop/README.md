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

## Easiest install — no terminal (recommended for school Macs)

Many school Macs have Terminal blocked, so the everyday way to install Anchor is
the **.dmg**, just like any Mac app:

1. Download: **https://github.com/IdanShalem444/Anchor/releases/latest/download/Anchor.dmg**
   (always the latest version — works in any browser, no terminal).
2. Open the downloaded `Anchor.dmg`, then **drag Anchor onto the Applications
   folder** in the window that appears.
3. First launch only: **right-click (or Control-click) Anchor → Open → Open**.
   (Because the app isn't paid-Apple-notarized, double-clicking shows an
   "unidentified developer" warning the first time; right-click → Open bypasses
   it. After that it opens normally and auto-updates itself.)

> No Terminal needed at any step. Once installed (0.1.2+), updates install
> themselves — nobody touches Terminal again.
>
> **Can't install apps at all** (fully locked-down Mac)? Just use the website —
> https://anchor-seven-lyart.vercel.app — it needs no install (you only lose the
> desktop widgets + native reminders).

## Alternative — install from the terminal

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
- **Auto-update:** already wired up — see `main.js` (checks GitHub Releases,
  downloads the `-mac.zip`, swaps the app bundle in place).

## Code signing & notarization (removes the "Apple cannot verify" warning)

Unsigned builds trigger that warning for every user, every install — the
right-click-Open trick above is a workaround, not a fix. Removing it for good
needs a **paid Apple Developer Program account (US$99/year)** — that part only
you can do. Once you have it, the build is already wired to sign + notarize
automatically (`build.mac` in `package.json` + `scripts/notarize.js` as the
`afterSign` hook) — you just need to supply three pieces of credentials.

**1. Enroll:** https://developer.apple.com/programs/enroll/ (your own Apple ID
   + payment; approval is usually instant to ~48h).

**2. Create a "Developer ID Application" certificate** (the one for apps
   distributed *outside* the Mac App Store):
   - Open **Xcode → Settings → Accounts** → add your Apple ID → select your
     team → **Manage Certificates** → **+** → **Developer ID Application**.
     This creates the certificate + private key in your login Keychain.
   - Electron-builder picks up a Keychain certificate automatically — no
     config needed. (If you'd rather build on a machine without Xcode/Keychain
     access, e.g. CI, export it instead: Keychain Access → find the cert →
     right-click → **Export** → save as a `.p12` with a password, then set
     `CSC_LINK=/path/to/cert.p12` and `CSC_KEY_PASSWORD=<that password>`.)

**3. Get your Team ID:** developer.apple.com/account → **Membership details**
   (or Xcode → Accounts → your team). A short alphanumeric code like `A1B2C3D4E5`.

**4. Create an app-specific password** for notarization (this is *not* your
   Apple ID password): https://appleid.apple.com → **Sign-In and Security** →
   **App-Specific Passwords** → generate one, name it "Anchor notarization".

**5. Provide the credentials.** Either export them in your shell before
   building, or — easier — create `desktop/.env` (already gitignored, never
   committed) with:

   ```
   APPLE_ID=you@example.com
   APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop
   APPLE_TEAM_ID=A1B2C3D4E5
   ```

**6. Build as usual:**

   ```bash
   cd desktop && npm run dist:mac
   ```

   You'll see `[notarize] Submitting Anchor.app to Apple — this can take
   several minutes…` then `[notarize] Done — notarization ticket stapled to
   the app.` in the build output. If the credentials aren't set, it logs a
   skip message and builds unsigned exactly as before — nothing breaks if you
   want to keep testing without paying yet.

**Verify it worked**, before shipping a release:
```bash
spctl --assess --type execute -v "desktop/dist/mac-arm64/Anchor.app"
# should print: accepted, source=Notarized Developer ID
```

A Windows code-signing cert would similarly remove the SmartScreen warning on
`dist:win`, but is out of scope until there's Windows demand.
