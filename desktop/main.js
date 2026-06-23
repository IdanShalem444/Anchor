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

// The desktop app is a native shell around the live Anchor web app, so it always
// runs the latest version and shares the same account/data. Override for dev with
// ANCHOR_URL=http://localhost:3000.
const APP_URL = process.env.ANCHOR_URL || "https://anchor-seven-lyart.vercel.app";

let mainWindow = null;
let tray = null;
const widgetWindows = new Map();

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
    return;
  }
  const win = new BrowserWindow({
    width: 380,
    height: 560,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: title || "Anchor",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(`${APP_URL}${routePath}`);
  win.on("closed", () => widgetWindows.delete(routePath));
  widgetWindows.set(routePath, win);
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
