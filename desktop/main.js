"use strict";

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  shell,
  nativeImage,
  Notification,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

const REPO = "IdanShalem444/Anchor";

// The desktop app is a native shell around the live Anchor web app, so it always
// runs the latest version and shares the same account/data. Override for dev with
// ANCHOR_URL=http://localhost:3000.
const APP_URL = process.env.ANCHOR_URL || "https://anchor-seven-lyart.vercel.app";

let mainWindow = null;
let tray = null;
const widgetWindows = new Map();

const WIDGET_TITLES = {
  "/widget/todo": "To-do",
  "/widget/next": "Next up",
  "/widget/capture": "Quick capture",
  "/widget/timer": "Focus timer",
  "/widget/streak": "Study streak",
  "/school/reminders": "Reminders",
};

// Persist each widget's size + position + open state so they come back exactly
// where you left them (real-desktop-widget behaviour).
function stateFile() {
  return path.join(app.getPath("userData"), "widgets.json");
}
function readWidgetState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), "utf8"));
  } catch {
    return {};
  }
}
function patchWidgetState(route, patch) {
  const s = readWidgetState();
  s[route] = { ...(s[route] || {}), ...patch };
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(s));
  } catch {}
}

function trayIcon() {
  const p = path.join(__dirname, "assets", "trayTemplate.png");
  const img = nativeImage.createFromPath(p);
  if (img.isEmpty()) return nativeImage.createEmpty();
  img.setTemplateImage(true); // adapts to light/dark menu bar on macOS
  return img;
}

function createMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#0b1020",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  mainWindow.loadURL(APP_URL);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Open links to other sites in the user's real browser, keep Anchor in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Closing the window hides it to the tray instead of quitting. If it's in
  // macOS fullscreen we must exit fullscreen FIRST and let the Space-collapse
  // animation FULLY finish before hiding — hiding the instant
  // `leave-full-screen` fires is too early: macOS hasn't torn down the
  // fullscreen Space yet, so it's left behind as an empty black screen with
  // Anchor still frontmost in the menu bar.
  const hideToTray = () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
  };
  mainWindow.on("close", (e) => {
    if (app.isQuitting) return;
    e.preventDefault();
    if (mainWindow.isFullScreen()) {
      mainWindow.once("leave-full-screen", () => {
        // Wait out the ~0.5s macOS exit-fullscreen animation before hiding.
        setTimeout(hideToTray, 600);
      });
      mainWindow.setFullScreen(false);
    } else {
      hideToTray();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Small always-on-top "widget" windows (installable mini panels). Each route
// gets one window; clicking its tray item again just focuses it.
function openWidget(routePath, title) {
  const existing = widgetWindows.get(routePath);
  if (existing) {
    existing.show();
    existing.focus();
    return existing;
  }
  const saved = readWidgetState()[routePath] || {};
  const b = saved.bounds || {};
  const win = new BrowserWindow({
    width: b.width || 380,
    height: b.height || 560,
    x: typeof b.x === "number" ? b.x : undefined,
    y: typeof b.y === "number" ? b.y : undefined,
    minWidth: 200,
    minHeight: 150,
    resizable: true, // drag any edge/corner to resize
    movable: true, // drag the title bar to reposition
    maximizable: true,
    alwaysOnTop: true, // stays visible over other apps
    skipTaskbar: true,
    fullscreenable: false,
    title: title || WIDGET_TITLES[routePath] || "Anchor",
    // Standard frame = a clear, draggable title bar + native resize handles on
    // every edge. (hiddenInset left almost no grab area, so widgets felt stuck.)
    titleBarStyle: "default",
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Float above other windows, but stay pinned to the desktop/Space it's on —
  // it should NOT follow you when you three-finger swipe between Spaces.
  win.setAlwaysOnTop(true, "floating");
  if (win.setVisibleOnAllWorkspaces) {
    win.setVisibleOnAllWorkspaces(false);
  }

  win.loadURL(`${APP_URL}${routePath}`);

  const saveBounds = () => patchWidgetState(routePath, { bounds: win.getBounds(), open: true });
  win.on("moved", saveBounds); // remember placement
  win.on("resized", saveBounds); // remember size
  win.on("close", () =>
    patchWidgetState(routePath, { bounds: win.getBounds(), open: false })
  );
  win.on("closed", () => widgetWindows.delete(routePath));

  patchWidgetState(routePath, { open: true });
  widgetWindows.set(routePath, win);
  return win;
}

// Reopen the widgets that were on screen last session.
function restoreWidgets() {
  const s = readWidgetState();
  for (const route of Object.keys(s)) {
    if (s[route] && s[route].open) openWidget(route, WIDGET_TITLES[route]);
  }
}

function createTray() {
  tray = new Tray(trayIcon());
  const menu = Menu.buildFromTemplate([
    { label: "Open Anchor", click: createMainWindow },
    { type: "separator" },
    {
      label: "Widgets",
      submenu: [
        { label: "To-do list", click: () => openWidget("/widget/todo", "To-do") },
        { label: "Next up", click: () => openWidget("/widget/next", "Next up") },
        { label: "Quick capture", click: () => openWidget("/widget/capture", "Quick capture") },
        { label: "Focus timer", click: () => openWidget("/widget/timer", "Focus timer") },
        { label: "Study streak", click: () => openWidget("/widget/streak", "Study streak") },
        { type: "separator" },
        { label: "Reminders", click: () => openWidget("/school/reminders", "Reminders") },
      ],
    },
    { type: "separator" },
    { label: "Check for updates…", click: () => checkForUpdates({ silent: false }) },
    {
      label: "Open at login",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: "separator" },
    {
      label: "Quit Anchor",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Anchor");
  tray.setContextMenu(menu);
  tray.on("click", createMainWindow);
}

// ── Self-contained auto-updater ───────────────────────────────────────────
// macOS silent update (Squirrel) needs a paid Apple Developer cert. Instead we
// check GitHub Releases, and if a newer version exists, download the zip and
// swap the app bundle in place, then relaunch. Works on unsigned builds.
function shq(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
function isNewer(remoteTag, local) {
  const r = String(remoteTag).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const l = String(local).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates({ silent } = {}) {
  if (!app.isPackaged || process.platform !== "darwin") return;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { "User-Agent": "Anchor-Updater", Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`release check ${res.status}`);
    const rel = await res.json();
    const tag = String(rel.tag_name || "");
    if (!isNewer(tag, app.getVersion())) {
      if (!silent)
        dialog.showMessageBox({
          message: "You're up to date.",
          detail: `Anchor ${app.getVersion()} is the latest version.`,
        });
      return;
    }
    const asset =
      (rel.assets || []).find((a) => /-mac\.zip$/.test(a.name)) ||
      (rel.assets || []).find((a) => /\.zip$/.test(a.name));
    if (!asset) return;
    const choice = dialog.showMessageBoxSync({
      type: "info",
      buttons: ["Update now", "Later"],
      defaultId: 0,
      cancelId: 1,
      message: "A new version of Anchor is available",
      detail: `Anchor ${tag} is available (you have v${app.getVersion()}). Update now? Anchor will restart.`,
    });
    if (choice !== 0) return;
    await downloadAndApply(asset.browser_download_url);
  } catch (e) {
    console.error("[updater]", e);
    if (!silent)
      dialog.showMessageBox({ message: "Couldn't check for updates.", detail: String(e) });
  }
}

async function downloadAndApply(url) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "anchor-upd-"));
  const zipPath = path.join(tmp, "Anchor.zip");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));

  await new Promise((resolve, reject) => {
    const p = spawn("ditto", ["-x", "-k", zipPath, path.join(tmp, "out")]);
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`ditto exit ${c}`))));
  });

  const out = path.join(tmp, "out");
  const newApp = fs
    .readdirSync(out)
    .map((n) => path.join(out, n))
    .find((p) => p.endsWith(".app"));
  if (!newApp) throw new Error("no .app inside the update");

  // Locate the running app bundle (.../Anchor.app).
  const bundle = app.getPath("exe").replace(/\/Contents\/MacOS\/[^/]+$/, "");
  if (!bundle.endsWith(".app")) throw new Error("couldn't locate the app bundle");

  // A detached script waits for us to quit, swaps the bundle, then relaunches.
  const script = path.join(tmp, "swap.sh");
  fs.writeFileSync(
    script,
    [
      "#!/bin/bash",
      "sleep 1",
      `rm -rf ${shq(bundle)}`,
      `cp -R ${shq(newApp)} ${shq(bundle)}`,
      `xattr -dr com.apple.quarantine ${shq(bundle)} 2>/dev/null || true`,
      `open ${shq(bundle)}`,
      `rm -rf ${shq(tmp)}`,
      "",
    ].join("\n")
  );
  fs.chmodSync(script, 0o755);
  const child = spawn("/bin/bash", [script], { detached: true, stdio: "ignore" });
  child.unref();
  app.isQuitting = true;
  app.quit();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", createMainWindow);

  // Cmd-Q / app quit must actually quit (otherwise the close handler would just
  // hide the window and the app would appear stuck in the tray).
  app.on("before-quit", () => {
    app.isQuitting = true;
  });

  app.whenReady().then(() => {
    if (process.platform === "darwin") {
      app.setName("Anchor");
      // Show the Anchor logo in the Dock even when running from source
      // (`npm start`). In the packaged app the bundled icon is used; this just
      // fixes the dev-mode Electron logo.
      if (app.dock) {
        try {
          app.dock.setIcon(path.join(__dirname, "assets", "icon.png"));
        } catch {}
      }
    }
    createMainWindow();
    createTray();
    restoreWidgets(); // bring back widgets that were on screen last time
    setTimeout(() => checkForUpdates({ silent: true }), 4000); // auto-check on launch

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
      else createMainWindow();
    });
  });

  // Keep running in the tray when all windows are closed (don't quit).
  app.on("window-all-closed", () => {
    // no-op: the tray keeps the app alive; use Quit to exit
  });
}

// Expose a tiny native-notification helper to the renderer (see preload.js).
const { ipcMain } = require("electron");
ipcMain.handle("anchor:notify", (_e, { title, body } = {}) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title: title || "Anchor", body: body || "" });
  n.on("click", createMainWindow);
  n.show();
  return true;
});
