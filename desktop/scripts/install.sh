#!/usr/bin/env bash
#
# Anchor — one-line installer.
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/desktop/scripts/install.sh | bash
#
# Downloads the latest released Anchor.app and installs it to ~/Applications
# (no admin password needed). Override the source with ANCHOR_OWNER / ANCHOR_REPO.
set -euo pipefail

OWNER="${ANCHOR_OWNER:-IdanShalem444}"
REPO="${ANCHOR_REPO:-Anchor}"
DEST="$HOME/Applications"

if [ "$(uname)" != "Darwin" ]; then
  echo "This installer is for macOS. (Windows/Linux: download the installer from the GitHub Releases page.)"
  exit 1
fi

echo "→ Finding the latest Anchor release in $OWNER/$REPO…"
API="https://api.github.com/repos/$OWNER/$REPO/releases/latest"
URL="$(curl -fsSL "$API" | grep -oE '"browser_download_url"[^,]*\.zip"' | sed -E 's/.*"(https[^"]+)".*/\1/' | head -1)"

if [ -z "${URL:-}" ]; then
  echo "✗ Couldn't find a .zip asset in the latest release of $OWNER/$REPO."
  echo "  Make sure a release exists with the Anchor mac .zip attached."
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "→ Downloading Anchor…"
curl -fL# "$URL" -o "$TMP/Anchor.zip"

echo "→ Unpacking…"
ditto -x -k "$TMP/Anchor.zip" "$TMP/out"
APP="$(find "$TMP/out" -maxdepth 3 -name 'Anchor.app' -type d | head -1)"
if [ -z "${APP:-}" ]; then
  echo "✗ Anchor.app wasn't found inside the download."
  exit 1
fi

echo "→ Installing to $DEST…"
mkdir -p "$DEST"
rm -rf "$DEST/Anchor.app"
cp -R "$APP" "$DEST/"
# Clear any quarantine flag so it opens without the Gatekeeper warning.
xattr -dr com.apple.quarantine "$DEST/Anchor.app" 2>/dev/null || true

echo "✓ Installed. Launching Anchor…"
open "$DEST/Anchor.app" || true
echo
echo "Anchor is in ~/Applications — open it any time from Launchpad or Spotlight."
