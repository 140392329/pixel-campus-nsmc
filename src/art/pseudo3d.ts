/**
 * 伪 3D 建筑合成。
 *
 * 思路：先用程序化贴图（textures.ts）画出底子，再把"照片像素化"得到的实景立面
 * 贴到墙面区域，最后叠一层体积感——屋顶顶面的明暗渐变、檐口落影、左右侧面暗带、
 * 接地阴影。这样每栋楼在俯视 3/4 视角下不再是一块平面贴图，而是有厚度的体块。
 *
 * 所有操作都在 canvas 上做一次，生成 `bld3d_<id>` 贴图后缓存，不会每帧重画。
 */
import Phaser from 'phaser';
import { ensureBuildingTexture } from './textures';
import { PHOTO_FACADES } from './photoManifest';
import type { BuildingDef } from '../types';

function roofBand(b: BuildingDef): number {
  const h = b.rect.h;
  if (b.style === 'chinese') return Math.round(Math.min(150, Math.max(60, h * 0.29)));
  if (b.style === 'dorm') return Math.round(Math.max(18, Math.min(46, h * 0.14)));
  if (b.style === 'modern') return Math.round(Math.max(16, Math.min(44, h * 0.13)));
  return Math.round(Math.max(14, Math.min(34, h * 0.12)));
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * @param photoKey 已预加载的像素化照片贴图 key（如 `photo_gate_south`）；
 *                 不传则只对程序化贴图做体积感处理。
 */
export function ensureBuildingBox(
  scene: Phaser.Scene,
  b: BuildingDef,
  photoKey?: string,
): string {
  const key = `bld3d_${b.id}_${photoKey ? 'p' : 'n'}`;
  if (scene.textures.exists(key)) return key;

  const baseKey = ensureBuildingTexture(scene, b);
  const w = b.rect.w;
  const h = b.rect.h;
  const canvasTex = scene.textures.createCanvas(key, w, h);
  if (!canvasTex) return baseKey;

  const ctx = canvasTex.context;
  ctx.imageSmoothingEnabled = false;
  const baseSrc = scene.textures.get(baseKey).getSourceImage();
  ctx.drawImage(baseSrc as CanvasImageSource, 0, 0, w, h);

  const band = roofBand(b);
  const spec = PHOTO_FACADES[b.id];

  // ---- 1. 实景照片立面 ----
  if (photoKey && scene.textures.exists(photoKey)) {
    const src = scene.textures.get(photoKey).getSourceImage() as CanvasImageSource;
    const srcW = scene.textures.get(photoKey).getSourceImage().width;
    const srcH = scene.textures.get(photoKey).getSourceImage().height;
    // full：照片自带屋顶线，铺满整个矩形；wall：只铺墙身，屋顶留给程序化贴图
    const wallTop = spec?.mode === 'full' ? 0 : Math.round(h * (spec?.wallTop ?? 0.3));
    const wallH = h - wallTop;

    // 照片贴法由 spec.anchor 决定：
    //   'top'（默认）照片贴墙身上缘，适合"整面立面"照；
    //   'bottom'     照片贴楼底，适合只拍到入口门厅/门洞的照片——上层由程序化窗户续上，
    //                这正是真实楼层的读法（底层门厅 + 上部标准层），不会出现"玻璃幕墙浮在半空"。
    const k = w / srcW;
    const drawH = Math.min(srcH * k, wallH);
    const anchor = spec?.anchor ?? 'top';
    const drawY = anchor === 'bottom' ? wallTop + wallH - drawH : wallTop;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, wallTop, w, wallH);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, drawY, w, drawH);

    // 与程序化墙面接缝处做一条渐隐，避免"两层皮"的硬边
    const fade = Math.min(Math.max(18, Math.round(drawH * 0.4)), Math.round(drawH * 0.6));
    if (drawH < wallH) {
      if (anchor === 'top') {
        const seamY = drawY + drawH;
        const g2 = ctx.createLinearGradient(0, seamY - 6, 0, seamY + fade);
        g2.addColorStop(0, rgba(38, 34, 30, 0));
        g2.addColorStop(1, rgba(38, 34, 30, 0.85));
        ctx.fillStyle = g2;
        ctx.fillRect(0, seamY - 6, w, fade + 6);
      } else {
        const seamY = drawY;
        const g2 = ctx.createLinearGradient(0, seamY - fade, 0, seamY + 6);
        g2.addColorStop(0, rgba(38, 34, 30, 0.85));
        g2.addColorStop(1, rgba(38, 34, 30, 0));
        ctx.fillStyle = g2;
        ctx.fillRect(0, seamY - fade, w, fade + 6);
      }
    }
    ctx.restore();

    // 让照片融进场景光照：上暗（檐下阴影）、中透、下亮（地面反光）
    const lg = ctx.createLinearGradient(0, wallTop, 0, h);
    lg.addColorStop(0, rgba(0, 0, 0, 0.3));
    lg.addColorStop(0.45, rgba(0, 0, 0, 0.04));
    lg.addColorStop(1, rgba(255, 246, 226, 0.08));
    ctx.fillStyle = lg;
    // 照片贴在楼底时，只把光照压在照片以上的程序化墙面上，别把门厅压黑
    const shadeH = anchor === 'bottom' ? Math.max(0, drawY - wallTop) : wallH;
    if (shadeH > 0) ctx.fillRect(0, wallTop, w, shadeH);
  }

  // ---- 2. 屋顶顶面：上亮下暗，读作朝上的一片屋面 ----
  if (band > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, band);
    ctx.clip();
    const rg = ctx.createLinearGradient(0, 0, 0, band);
    rg.addColorStop(0, rgba(255, 252, 236, 0.16));
    rg.addColorStop(0.45, rgba(255, 255, 255, 0.03));
    rg.addColorStop(1, rgba(0, 0, 0, 0.18));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, band);
    ctx.restore();

    // 檐口落影：压在墙身上缘，说明屋顶比墙挑出来
    const eave = Math.max(5, Math.round(h * 0.022));
    const sg = ctx.createLinearGradient(0, band, 0, band + eave * 2);
    sg.addColorStop(0, rgba(24, 18, 12, 0.5));
    sg.addColorStop(1, rgba(24, 18, 12, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(0, band, w, eave * 2);
    ctx.fillStyle = rgba(20, 14, 8, 0.35);
    ctx.fillRect(0, band - 1, w, 2);
  }

  // ---- 3. 左右侧面：左边受光、右边背光，形成体块厚度 ----
  const sideL = Math.max(3, Math.round(w * 0.006));
  const sideR = Math.max(6, Math.round(w * 0.011));
  const gradL = ctx.createLinearGradient(0, 0, sideL, 0);
  gradL.addColorStop(0, rgba(255, 248, 230, 0.1));
  gradL.addColorStop(1, rgba(255, 248, 230, 0));
  ctx.fillStyle = gradL;
  ctx.fillRect(0, band, sideL, h - band);

  const gradR = ctx.createLinearGradient(w - sideR, 0, w, 0);
  gradR.addColorStop(0, rgba(0, 0, 0, 0));
  gradR.addColorStop(1, rgba(12, 8, 4, 0.42));
  ctx.fillStyle = gradR;
  ctx.fillRect(w - sideR, band, sideR, h - band);

  // ---- 4. 接地阴影：楼脚压在地面上 ----
  const foot = Math.max(4, Math.round(h * 0.02));
  const fg = ctx.createLinearGradient(0, h - foot, 0, h);
  fg.addColorStop(0, rgba(0, 0, 0, 0));
  fg.addColorStop(1, rgba(0, 0, 0, 0.28));
  ctx.fillStyle = fg;
  ctx.fillRect(0, h - foot, w, foot);

  canvasTex.refresh();
  return key;
}
