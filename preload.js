const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisWindow', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  installUpdate: () => ipcRenderer.send('updates:install'),
  onUpdateStatus: (callback) => ipcRenderer.on('updates:status', (_event, status) => callback(status))
});
