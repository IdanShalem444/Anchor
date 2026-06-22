"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// A minimal, safe bridge. The web app can detect it's running in the desktop
// shell (window.anchorDesktop) and fire true native OS notifications for
// reminders via window.anchorDesktop.notify(...).
contextBridge.exposeInMainWorld("anchorDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  notify: (title, body) => ipcRenderer.invoke("anchor:notify", { title, body }),
});
