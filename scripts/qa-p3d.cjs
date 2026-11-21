// 临时：拍图情信息中心（程序化 + 伪3D），检查没有照片的建筑是否也变好了。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const out = path.join(process.cwd(), 'qa');
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  const box = await page.locator('canvas').boundingBox();
  const scale = box.width / 960;
  await page.mouse.click(box.x + 480 * scale, box.y + 300 * scale);
  await page.waitForTimeout(2600);

  const shots = [
    { name: 'p1-center-info', x: 1550, y: 1780, zoom: 0.75 },
    { name: 'p2-hongyi', x: 2225, y: 2500, zoom: 0.75 },
    { name: 'p3-dorm-he', x: 375, y: 1160, zoom: 0.8 },
    { name: 'p4-tech-park', x: 2320, y: 1900, zoom: 0.8 },
  ];

  for (const s of shots) {
    await page.evaluate((cfg) => {
      const scene = window.__game.scene.getScene('World');
      scene.loadOutdoor({ x: cfg.x, y: cfg.y });
      scene.cameras.main.setZoom(cfg.zoom);
    }, s);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `${s.name}.png`) });
  }

  console.log(JSON.stringify({ errors }));
  await browser.close();
})();
