const { app, BrowserWindow, ipcMain, safeStorage, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { autoUpdater } = require('electron-updater');

const DEFAULT_MODEL = 'openrouter/auto';
const DEFAULT_API_BASE_URL = 'https://openrouter.ai/api/v1';
const SETTINGS_FILE = 'settings.json';

function settingsPath() {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

function normalizeApiBaseUrl(value = DEFAULT_API_BASE_URL) {
  let parsed;
  try { parsed = new URL(String(value).trim().replace(/\/+$/, '')); } catch { throw new Error('Укажите корректный адрес API OpenRouter.'); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'openrouter.ai' || parsed.port || parsed.pathname !== '/api/v1' || parsed.search || parsed.hash) {
    throw new Error('Адрес должен быть https://openrouter.ai/api/v1.');
  }
  return parsed.origin + parsed.pathname;
}

function readSettings() {
  let stored = {};
  try { stored = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); } catch {}
  let apiKey = '';
  if (stored.encryptedApiKey && safeStorage.isEncryptionAvailable()) {
    try { apiKey = safeStorage.decryptString(Buffer.from(stored.encryptedApiKey, 'base64')); } catch {}
  }
  return {
    apiKey,
    apiBaseUrl: (() => { try { return normalizeApiBaseUrl(stored.apiBaseUrl || DEFAULT_API_BASE_URL); } catch { return DEFAULT_API_BASE_URL; } })(),
    model: typeof stored.model === 'string' ? stored.model : DEFAULT_MODEL,
    transcriptionModel: typeof stored.transcriptionModel === 'string' ? stored.transcriptionModel : 'openai/whisper-1'
  };
}

function writeSettings(settings) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), { mode: 0o600 });
}

function assertTrustedSender(event) {
  const url = event.senderFrame?.url || '';
  if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame || !url.startsWith('file://')) {
    throw new Error('Недоверенный источник запроса.');
  }
}

async function openRouterRequest(endpoint, body) {
  const { apiKey } = readSettings();
  if (!apiKey) throw new Error('Добавьте API-ключ OpenRouter в настройках приложения.');
  const { apiBaseUrl } = readSettings();
  const response = await fetch(`${apiBaseUrl}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'Jarvis Pro by Sergio'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(65000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(detail.slice(0, 500));
  }
  return data;
}

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
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile('index.html');
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const trustedApp = webContents.getURL().startsWith('file://');
    callback(permission === 'media' && trustedApp);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media' && Boolean(webContents?.getURL().startsWith('file://'));
  });

  ipcMain.on('window:minimize', event => BrowserWindow.fromWebContents(event.sender)?.minimize());
  ipcMain.on('updates:install', () => autoUpdater.quitAndInstall());
  ipcMain.on('openrouter:open-key-page', () => shell.openExternal('https://openrouter.ai/settings/keys'));
  ipcMain.on('window:close', event => BrowserWindow.fromWebContents(event.sender)?.close());

  ipcMain.handle('settings:get', event => {
    assertTrustedSender(event);
    const settings = readSettings();
    return { apiKeyConfigured: Boolean(settings.apiKey), apiBaseUrl: settings.apiBaseUrl, model: settings.model, transcriptionModel: settings.transcriptionModel };
  });

  ipcMain.handle('settings:save', (event, values = {}) => {
    assertTrustedSender(event);
    const current = readSettings();
    const model = String(values.model || DEFAULT_MODEL).trim();
    const transcriptionModel = String(values.transcriptionModel || 'openai/whisper-1').trim();
    const apiBaseUrl = normalizeApiBaseUrl(values.apiBaseUrl || DEFAULT_API_BASE_URL);
    if (!/^[\w.-]+\/[\w.:+-]+$/.test(model)) throw new Error('Укажите модель в формате provider/model.');
    if (!/^[\w.-]+\/[\w.:+-]+$/.test(transcriptionModel)) throw new Error('Неверное название модели распознавания.');
    let encryptedApiKey = '';
    if (values.clearApiKey) {
      encryptedApiKey = '';
    } else if (typeof values.apiKey === 'string' && values.apiKey.trim()) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows не смогла включить защищённое хранение ключа.');
      encryptedApiKey = safeStorage.encryptString(values.apiKey.trim()).toString('base64');
    } else if (current.apiKey) {
      const previous = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
      encryptedApiKey = previous.encryptedApiKey;
    }
    writeSettings({ encryptedApiKey, apiBaseUrl, model, transcriptionModel });
    return { apiKeyConfigured: Boolean(encryptedApiKey), apiBaseUrl, model, transcriptionModel };
  });

  ipcMain.handle('ai:chat', async (event, values = {}) => {
    assertTrustedSender(event);
    const settings = readSettings();
    const messages = Array.isArray(values.messages) ? values.messages.slice(-32) : [];
    if (!messages.length || messages.length > 32) throw new Error('Нет сообщений для отправки.');
    const safeMessages = messages.map(message => {
      if (!['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
        throw new Error('Неверный формат сообщения.');
      }
      return { role: message.role, content: message.content.slice(0, 30000) };
    });
    const data = await openRouterRequest('chat/completions', {
      model: settings.model,
      messages: safeMessages,
      temperature: 0.7,
      max_completion_tokens: 1600
    });
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    if (Array.isArray(content)) return content.map(part => part?.text || '').join('').trim();
    throw new Error('OpenRouter вернул пустой ответ.');
  });

  ipcMain.handle('ai:transcribe', async (event, values = {}) => {
    assertTrustedSender(event);
    const data = String(values.data || '');
    const format = String(values.format || 'webm').toLowerCase();
    if (!data || data.length > 32 * 1024 * 1024) throw new Error('Запись пустая или слишком большая.');
    if (!['wav', 'mp3', 'flac', 'm4a', 'ogg', 'webm', 'aac'].includes(format)) throw new Error('Неизвестный формат аудио.');
    const settings = readSettings();
    const result = await openRouterRequest('audio/transcriptions', {
      model: settings.transcriptionModel,
      input_audio: { data, format },
      language: 'ru'
    });
    if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('Не удалось распознать речь. Попробуйте записать ещё раз.');
    return result.text.trim();
  });

  createWindow();
  configureUpdates();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
