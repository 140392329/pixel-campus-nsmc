const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const out = path.join(process.cwd(), 'qa');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(out, '01-menu.png') });

  const box = await page.locator('canvas').boundingBox();
  const scale = box.width / 960;
  await page.mouse.click(box.x + 480 * scale, box.y + 300 * scale);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(out, '02-spawn.png') });

  await page.keyboard.down('w');
  await page.waitForTimeout(2200);
  await page.keyboard.up('w');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '03-plaza.png') });

  await page.evaluate(() => {
    const game = window.__game;
    const scene = game.scene.getScene('World');
    scene.player.setPosition(1600, 2432);
    scene.facing = 'up';
  });
  await page.waitForTimeout(500);
  await page.keyboard.press('e');
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(out, '04-dialog.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('World');
    scene.player.setPosition(1600, 1980);
    scene.facing = 'up';
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, '05-bridge-library.png') });

  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('World');
    scene.loadInterior('interior_library');
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, '06-interior.png') });

  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('World');
    scene.loadOutdoor({ x: 350, y: 1850 });
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, '07-courts.png') });

  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('World');
    scene.player.setPosition(1600, 1650);
    scene.facing = 'up';
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, '08-library-front.png') });

  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('World');
    scene.player.setPosition(450, 880);
    scene.facing = 'up';
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, '09-track.png') });

  const state = await page.evaluate(() => ({
    menu: window.__game.scene.isActive('Menu'),
    world: window.__game.scene.isActive('World'),
    ui: window.__game.scene.isActive('UI'),
    zone: document.querySelector('.hud-top .zone')?.textContent,
    time: document.querySelector('.hud-top .clock')?.textContent,
  }));
  console.log(JSON.stringify({ errors, state }, null, 2));
  await browser.close();
})();
