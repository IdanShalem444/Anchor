"use strict";

// electron-builder afterSign hook: notarizes the signed .app with Apple's
// notarytool so Gatekeeper stops showing "Apple cannot verify this app".
//
// Needs three credentials as env vars (see desktop/README.md for how to get
// them): APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID. If they're
// not set, this SKIPS notarization (logs why) rather than failing the build —
// so `npm run dist:mac` keeps working unsigned until you've set them up.
//
// For convenience these can also live in a gitignored desktop/.env file
// (KEY=value per line) instead of being exported in your shell every time.

const fs = require("fs");
const path = require("path");
const { notarize } = require("@electron/notarize");

function loadDotEnv() {
  const file = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key] !== undefined) continue; // real env always wins
    process.env[key] = rawVal.replace(/^["']|["']$/g, "");
  }
}

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== "darwin") return;

  loadDotEnv();
  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log(
      "[notarize] Skipping — APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID " +
        "not set (see desktop/README.md). Build will be signed but NOT notarized."
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  if (!fs.existsSync(appPath)) {
    throw new Error(`[notarize] Expected app bundle not found at ${appPath}`);
  }

  console.log(`[notarize] Submitting ${appName}.app to Apple — this can take several minutes…`);
  await notarize({
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
    teamId: APPLE_TEAM_ID,
  });
  console.log("[notarize] Done — notarization ticket stapled to the app.");
};
