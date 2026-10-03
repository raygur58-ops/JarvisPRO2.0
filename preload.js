const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisWindow', {
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  installUpdate: () => ipcRenderer.send('updates:install'),
  openApiKeyPage: () => ipcRenderer.send('openrouter:open-key-page'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: values => ipcRenderer.invoke('settings:save', values),
  sendMessage: messages => ipcRenderer.invoke('ai:chat', { messages }),
  transcribeAudio: (data, format) => ipcRenderer.invoke('ai:transcribe', { data, format }),
  onUpdateStatus: callback => ipcRenderer.on('updates:status', (_event, status) => callback(status))
});
