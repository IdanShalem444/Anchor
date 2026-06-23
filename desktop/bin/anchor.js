#!/usr/bin/env node
"use strict";

// Lets `anchor` run as a terminal command after a global install
// (`npm install -g anchor-study-desktop`). It launches the Electron app.
const { spawn } = require("child_process");
const path = require("path");

let electron;
try {
  electron = require("electron"); // resolves to the Electron binary path
} catch (e) {
  console.error("Anchor: Electron isn't installed. Run `npm install` first.");
  process.exit(1);
}

const appDir = path.join(__dirname, "..");
const child = spawn(electron, [appDir], { stdio: "inherit", detached: false });
child.on("close", (code) => process.exit(code ?? 0));
