const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');

function configureUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({ provider: 'github', owner: 'raygur58-ops', repo: 'JarvisPRO2.0' });
  autoUpdater.on('update-available', info => sendUpdate('available', { version: info.version }));
  autoUpdater.on('download-progress', progress => sendUpdate('progress', { percent: Math.round(progress.percent) }));
  autoUpdater.on('update-downloaded', info => sendUpdate('ready', { version: info.version }));
  autoUpdater.on('error', error => sendUpdate('error', { message: error.message }));
  const check = () => autoUpdater.checkForUpdates().catch(error => console.error('Update check failed:', error));
  setTimeout(check, 12000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

function sendUpdate(status, details) {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('updates:status', { status, ...details });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 700,
    resizable: false,
    maximizable: false,
    frame: false,
    title: 'Jarvis Pro by Sergio',
    backgroundColor: '#00000000',
    transparent: true,
    roundedCorners: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.loadFile('index.html');
}

app.whenReady().then(() => {
  ipcMain.on('window:minimize', event => BrowserWindow.fromWebContents(event.sender)?.minimize());
  ipcMain.on('updates:install', () => autoUpdater.quitAndInstall());
  ipcMain.on('window:close', event => BrowserWindow.fromWebContents(event.sender)?.close());
  createWindow();
  configureUpdates();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
