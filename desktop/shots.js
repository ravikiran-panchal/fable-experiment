// Takes the store screenshots and banners straight from the real game, with no window shown.
// Run from the project root:  npm run shots     (writes PNG files into store/graphics/)
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const until = (text) => `{ let n = 0; while (!document.querySelector('#dialog .line').textContent.startsWith(${JSON.stringify(text)}) && n++ < 400) await G.step(0.25); await G.step(0.7); }`;
// name, link ending, what to do before the picture
const SCENES = [
  ['1-title', '', ''],
  ['2-village', 'roam', `G.start(0); await G.step(0.5); G.player.pos.set(1.5, 0, 62); G.player.yaw = Math.PI; G.cam.yaw = 0.25; G.cam.pitch = 0.2; await G.step(1.5);`],
  ['3-sign-weave', 'dojo', `G.start(1); await G.step(6); G.input.press('weave'); await G.step(0.4);`],
  ['4-fox-dream', 'dream', `G.auto = true; G.start(0); ${until('There you are')}`],
  ['5-valley', 'dream', `G.auto = true; G.start(2); ${until('Its leaves')}`],
  ['6-bonfire', 'festival', `G.auto = true; G.start(0); await G.step(0.5); G.player.pos.set(16, 0, 42); ${until('Taiko')}`],
  ['7-lantern-eye', 'dojo', `G.start(1); await G.step(6); G.player.ki = 100; G.jutsu.cast('eye'); await G.step(1.3);`],
  ['8-ether', 'ether', `G.start(0); await G.step(6); G.player.pos.set(60, 0, -52); G.player.yaw = 0; G.cam.close = false; G.cam.dist = 13; G.cam.yaw = Math.PI + 0.5; G.cam.pitch = 0.5; await G.step(0.5); G.player.ki = 100; G.jutsu.cast('melt'); await G.step(2);`],
];
const SIZES = { mac: [2560, 1600, 2], phone: [1920, 1080, 1.5] }; // width, height, zoom (bigger zoom = bigger HUD text)
const BANNERS = [['feature-graphic-1024x500', 1024, 500], ['cover-1200x630', 1200, 630]];

module.exports = async (outDir) => {
  fs.mkdirSync(outDir, { recursive: true });
  const win = new BrowserWindow({ show: false, width: 1280, height: 800, webPreferences: { offscreen: true, contextIsolation: true, sandbox: true } });
  await win.loadURL('app://game/privacy.html'); await win.webContents.executeJavaScript('localStorage.clear()'); // start with no saved game
  const shoot = async (file, w, h, hash, js, css = '', zoom = 1) => {
    win.setContentSize(w, h);
    await win.loadURL(`app://game/index.html?shot=${encodeURIComponent(file)}#${hash}`);
    win.webContents.setZoomFactor(zoom);
    if (css) await win.webContents.insertCSS(css);
    await win.webContents.executeJavaScript(`(async () => { localStorage.clear(); window.requestAnimationFrame = () => 0; /* the picture script drives the game clock itself */ const G = window.__game; await document.fonts.ready; ${js} await G.step(0.1); await new Promise((r) => setTimeout(r, 900)); await G.step(0.02); localStorage.clear(); })()`);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, file + '.png'), img.toPNG());
    console.log('shot', file, img.getSize().width + 'x' + img.getSize().height);
  };
  for (const [kind, [w, h, zoom]] of Object.entries(SIZES)) for (const [name, hash, js] of SCENES) await shoot(`${kind}-${name}`, w, h, hash, js, '#toast{display:none!important} #dialog:has(.line:empty){visibility:hidden}', zoom);
  for (const [name, w, h] of BANNERS) await shoot(name, w, h, '', '', '.pick,.eyebrow,.lede,#toast{display:none!important} #title{justify-content:center!important}');
  app.quit();
};
