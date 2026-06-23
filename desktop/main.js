"use strict";

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  shell,
  nativeImage,
  Notification,
} = require("electron");
const path = require("path");
const fs = require("fs");

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

  // Closing the window hides it to the tray instead of quitting.
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
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

  // Float above normal windows and follow you across every Space / full-screen app.
  win.setAlwaysOnTop(true, "floating");
  if (win.setVisibleOnAllWorkspaces) {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
    if (process.platform === "darwin") app.setName("Anchor");
    createMainWindow();
    createTray();
    restoreWidgets(); // bring back widgets that were on screen last time

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
