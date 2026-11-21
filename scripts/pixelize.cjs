/**
 * 实景照片 → 像素小图（游戏用的建筑立面素材）。
 *
 * 做法：把照片裁到指定区域 → 用浏览器的面积平均重采样缩到 ~240px 宽 →
 * 逐像素映射到 DB32 调色板（DawnBringer 32）→ 输出 PNG 到 public/pix/，
 * 同时生成 src/art/photoManifest.ts 供 BootScene 预加载。
 *
 * 用 playwright 跑：本机已装 playwright，不必再加 sharp/jimp 之类的依赖。
 *
 *   node scripts/pixelize.cjs
 *
 * 配置来源：scripts/facades/*.json，一栋建筑一个文件，方便多人并行处理
 * 不同建筑而不互相改同一个表。字段：
 *
 *   {
 *     "id": "gate_south",            // 必须等于 src/data/campus.ts 里的 building id
 *     "file": "refs/raw/xxx.jpg",    // 相对项目根目录的照片
 *     "crop": { "left": 0, "top": 0.235, "right": 1, "bottom": 0.66 },
 *     "targetW": 240,
 *     "mode": "full",                // full=照片是完整立面 / wall=只有墙身
 *     "wallTop": 0.3,                // 仅 wall 模式：墙身开始的相对高度
 *     "sourceUrl": "https://...",    // 照片来源，写进 docs/assets.md
 *     "note": "南门红砂岩门楼"
 *   }
 *
 * crop 是 0~1 的相对比例，原图换分辨率也不用重算。
 * crop 只留建筑本体：天空和地面必须裁掉，否则拼进地图会有一条"悬浮的天空"。
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SPEC_DIR = path.join(__dirname, 'facades');
const OUT_DIR = path.join(ROOT, 'public', 'pix');
const MANIFEST = path.join(ROOT, 'src', 'art', 'photoManifest.ts');

// DB32 调色板：像素游戏里最常用的 32 色，比自由取色更"像像素画"。
const DB32 = [
  '000000', '222034', '45283c', '663931', '8f563b', 'df7126', 'd9a066', 'eec39a',
  'fbf236', '99e550', '6abe30', '37946e', '4b692f', '524b24', '323c39', '3f3f74',
  '306082', '5b6ee1', '639bff', '5fcde4', 'cbdbfc', 'ffffff', '9badb7', '847e87',
  '696a6a', '595652', '76428a', 'ac3232', 'd95763', 'd77bba', '8f974a', '8a6f30',
];

// --only <id>：多人并行处理不同建筑时只出自己那一张，不碰共用的 manifest。
function onlyId() {
  const idx = process.argv.indexOf('--only');
  return idx > 0 ? process.argv[idx + 1] : null;
}

function loadSpecs() {
  if (!fs.existsSync(SPEC_DIR)) {
    console.log('no scripts/facades/*.json, nothing to do');
    return [];
  }
  const only = onlyId();
  const files = fs
    .readdirSync(SPEC_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const specs = [];
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), 'utf8'));
    if (!raw.id || !raw.file || !raw.crop) {
      console.warn(`skip ${f}: missing id/file/crop`);
      continue;
    }
    if (only && raw.id !== only) continue;
    const src = path.join(ROOT, raw.file);
    if (!fs.existsSync(src)) {
      console.warn(`skip ${raw.id}: photo not found -> ${raw.file}`);
      continue;
    }
    specs.push({
      mode: 'wall',
      wallTop: 0.3,
      anchor: 'top',
      // 天空镂空默认关闭：只有真正需要"透过建筑看穿"的场景（如南门门洞）才开。
      // 开着会把白色墙面、浅蓝玻璃窗一起抠掉——宿舍楼那种白墙照会碎成一块块。
      keyOut: false,
      targetW: 240,
      ...raw,
      specFile: f,
    });
  }
  if (only && specs.length === 0) {
    console.warn(`--only ${only}: no matching spec in scripts/facades/`);
  }
  return specs;
}

function toDataUrl(file) {
  const abs = path.join(ROOT, file);
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const specs = loadSpecs();
  if (specs.length === 0) return;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results = [];
  for (const photo of specs) {
    const dataUrl = toDataUrl(photo.file);
    const out = await page.evaluate(
      async ({ dataUrl, crop, targetW, palette, keyOut }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();

        const sx = Math.round(crop.left * img.naturalWidth);
        const sy = Math.round(crop.top * img.naturalHeight);
        const sw = Math.round((crop.right - crop.left) * img.naturalWidth);
        const sh = Math.round((crop.bottom - crop.top) * img.naturalHeight);
        const w = targetW;
        const h = Math.max(8, Math.round((sh / sw) * w));

        // 第一步：面积平均缩小（开平滑），保留大色块与明暗关系。
        const small = document.createElement('canvas');
        small.width = w;
        small.height = h;
        const sctx = small.getContext('2d');
        sctx.imageSmoothingEnabled = true;
        sctx.imageSmoothingQuality = 'high';
        sctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

        // 第二步：每个像素吸附到 DB32 里最接近的颜色。
        const pal = palette.map((hex) => [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
        ]);
        const data = sctx.getImageData(0, 0, w, h);
        const px = data.data;

        // 天空镂空：只抠"高饱和的青蓝天空"，让南门门洞透出游戏里的地面。
        // 判据故意写得很窄：b-r>45 会连白墙、浅蓝玻璃（DB32 的 cbdbfc 是 203,219,252，
        // b-r=49）一起抠掉，宿舍楼那种白墙照会碎成一块块。这里再加"亮度不能太高 +
        // 蓝色要明显压过红绿"，只留真正的天空蓝。
        const isSky = (r, g, b) =>
          b > 130 && b - r > 60 && b - g > 18 && !(r > 175 && g > 185 && b > 200);

        // 保持原色：DB32 是为奇幻题材调的色板，几乎没有砖红、朱砂、米白这些
        // 中国高校建筑最常见的颜色。硬吸附会把红色栏板变成洋红 d77bba、把米白墙
        // 变成冷灰。所以"饱和暖色"与"近中性色"直接保留原 RGB，只做量化到 8 级
        // 的台阶化，既保住真实配色，又仍有像素画的块面感。
        const keepColor = (r, g, b) => {
          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          const sat = mx === 0 ? 0 : (mx - mn) / mx;
          const warm = r >= g && g >= b; // 红/橙/黄一系
          if (sat > 0.18 && warm) return true; // 砖红、朱砂、土黄、木色
          if (sat <= 0.12) return true; // 灰白、米白、石材、玻璃
          return false;
        };
        const step = (v) => Math.min(255, Math.round(v / 12) * 12);

        for (let i = 0; i < px.length; i += 4) {
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          if (keepColor(r, g, b)) {
            px[i] = step(r);
            px[i + 1] = step(g);
            px[i + 2] = step(b);
          } else {
            let best = 0;
            let bestD = Infinity;
            for (let p = 0; p < pal.length; p += 1) {
              const dr = r - pal[p][0];
              const dg = g - pal[p][1];
              const db = b - pal[p][2];
              // 加权的欧氏距离，人眼对绿色更敏感
              const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
              if (d < bestD) {
                bestD = d;
                best = p;
              }
            }
            px[i] = pal[best][0];
            px[i + 1] = pal[best][1];
            px[i + 2] = pal[best][2];
          }
          if (keyOut && isSky(r, g, b)) px[i + 3] = 0;
        }
        sctx.putImageData(data, 0, 0);
        return { png: small.toDataURL('image/png'), w, h };
      },
      {
        dataUrl,
        crop: photo.crop,
        targetW: photo.targetW,
        palette: DB32,
        keyOut: photo.keyOut === true,
      },
    );

    const file = path.join(OUT_DIR, `${photo.id}.png`);
    fs.writeFileSync(file, Buffer.from(out.png.split(',')[1], 'base64'));
    results.push({ id: photo.id, w: out.w, h: out.h, ...photo });
    console.log(
      `pixelized ${photo.id} -> public/pix/${photo.id}.png (${out.w}x${out.h})  [${photo.mode}]`,
    );
  }

  await browser.close();

  if (onlyId()) {
    // 并行模式下不动共用 manifest：各自只出自己的 PNG，最后统一跑一次全量。
    console.log(`--only ${onlyId()}: png written, manifest left untouched`);
    return;
  }

  const lines = results.map((r) => {
    const bits = [`url: 'pix/${r.id}.png'`, `w: ${r.w}`, `h: ${r.h}`];
    if (r.mode === 'wall') {
      bits.push(`mode: 'wall'`, `wallTop: ${r.wallTop}`);
      if (r.anchor === 'bottom') bits.push(`anchor: 'bottom'`);
    } else {
      bits.push(`mode: 'full'`);
    }
    return `  '${r.id}': { ${bits.join(', ')} },`;
  });
  fs.writeFileSync(
    MANIFEST,
    `// 由 scripts/pixelize.cjs 自动生成，请勿手改。\n` +
      `// 每项对应 public/ 下一张已经像素化的实景照片立面。\n` +
      `export interface PhotoFacade {\n  url: string;\n  w: number;\n  h: number;\n` +
      `  /** full：照片是完整立面；wall：只有墙身，需要程序化屋顶兜住。 */\n` +
      `  mode?: 'full' | 'wall';\n  /** wall 模式下墙身顶端相对高度（0~1）。 */\n` +
      `  wallTop?: number;\n` +
      `  /** 照片贴墙身的位置：top=上缘（整面立面照）；bottom=楼底（入口/门厅照）。 */\n` +
      `  anchor?: 'top' | 'bottom';\n}\n\n` +
      `export const PHOTO_FACADES: Record<string, PhotoFacade> = {\n${lines.join('\n')}\n};\n`,
  );
  console.log(`wrote ${path.relative(ROOT, MANIFEST)} (${results.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
