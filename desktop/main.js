// Will of Fire: The Last Ember, as a desktop app. The game is the same web build as everywhere else
// (packed into ./www by `npm run desktop` in the project root). It is served from inside the app under
// app://game/ so the camera and the hand tracker work, and it makes no outside requests.
const { app, BrowserWindow, protocol, net, session, systemPreferences, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WWW = path.join(__dirname, 'www');
const TEST = process.env.EMBER_SELFTEST, SHOTS = process.env.EMBER_SHOTS;
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);

app.whenReady().then(async () => {
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(WWW, p));
    if (!file.startsWith(WWW)) return new Response('no', { status: 403 });
    return net.fetch(pathToFileURL(file).toString(), { headers: req.headers }); // passes Range through, so sounds can restart
  });
  // Only the camera may be asked for, and only by the game's own pages.
  const ok = (wc, perm) => perm === 'media' && (wc?.getURL() || '').startsWith('app://game/');
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ok(wc, perm));
  session.defaultSession.setPermissionRequestHandler(async (wc, perm, done) => {
    if (!ok(wc, perm)) return done(false);
    if (process.platform === 'darwin') { try { return done(await systemPreferences.askForMediaAccess('camera')); } catch { return done(false); } }
    done(true);
  });
  // Nothing in the game needs the network. Refuse anything that is not the app itself.
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(app|file|devtools|blob|data):/.test(d.url) }));

  if (SHOTS) return require('./shots.js')(SHOTS);
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 500, backgroundColor: '#0e0b16', show: !TEST, title: 'Will of Fire',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://game/')) e.preventDefault(); });
  await win.loadURL('app://game/index.html');

  if (TEST) { // npm run desktop:test: start the game without showing a window and report what works
    const out = await win.webContents.executeJavaScript(`(async () => {
      const G = window.__game; G.start(0); await G.step(1);
      let tracker = 'not tried';
      try { const m = await import(new URL('vendor/mediapipe/' + window.EMBER_VISION, document.baseURI).href); tracker = typeof m.HandLandmarker; } catch (e) { tracker = 'ERR ' + e.message; }
      await document.fonts.ready;
      return { title: document.title, secure: isSecureContext, protocol: location.protocol, phase: G.story.phase, sounds: G.audio.count, tracker, camera: !!navigator.mediaDevices?.getUserMedia,
        fonts: [...document.fonts].filter((f) => f.status === 'loaded').length, storage: (() => { try { localStorage.setItem('t', '1'); return localStorage.getItem('t') === '1'; } catch { return false; } })(),
        outside: performance.getEntriesByType('resource').filter((e) => !e.name.startsWith('app://')).length };
    })()`);
    console.log('SELFTEST ' + JSON.stringify(out));
    app.quit();
  }
});
app.on('window-all-closed', () => app.quit());
