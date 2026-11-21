import Phaser from 'phaser';
import type { BuildingDef, PropKind } from '../types';

type G = Phaser.GameObjects.Graphics;

const C = {
  outline: 0x2a2320,
  skin: 0xf0c8a0,
  skinShade: 0xd8a87e,
  hair: 0x2e2119,
  pants: 0x46506a,
  shoes: 0x2a2320,
  grass: 0x6f9f4a,
  grassDark: 0x5c8a3f,
  grassLight: 0x8ab85e,
  lawn: 0x5c8f45,
  dirt: 0xc2a06a,
  dirtDark: 0xa8835f,
  dirtLight: 0xd8bc8a,
  stone: 0xd8cbb4,
  stoneAlt: 0xcfc1a9,
  stoneDark: 0xa89a86,
  water: 0x3f7f9e,
  waterDark: 0x2f6680,
  waterLight: 0x5fa3c0,
  track: 0xb05a4a,
  court: 0x5a8f7a,
  wood: 0x8a5a3a,
  woodDark: 0x6a422a,
  woodLight: 0xb07a4e,
  roof: 0x5f5a54,
  roofAlt: 0x6d675f,
  roofRidge: 0x46423d,
  wall: 0xece4d4,
  wallShade: 0xd6cbb6,
  red: 0x7a2e2a,
  redLight: 0x9a4a3e,
  gold: 0xc9a24a,
  pine: 0x2f5a3a,
  pineLight: 0x3f7248,
  pineDark: 0x244a2e,
  ginkgo: 0xb9a83a,
  ginkgoLight: 0xd8c24a,
  ginkgoDark: 0x8a8a2f,
  leaf: 0x4f8a3f,
  leafLight: 0x6fae52,
  leafDark: 0x3a6a30,
};

function rnd(seed: number): () => number {
  let s = (seed || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function specks(
  g: G,
  n: number,
  colors: number[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  seed: number,
): void {
  const r = rnd(seed);
  for (let i = 0; i < n; i += 1) {
    g.fillStyle(colors[Math.floor(r() * colors.length)], 0.55 + r() * 0.35);
    g.fillRect(x0 + Math.floor(r() * w), y0 + Math.floor(r() * h), 1 + Math.floor(r() * 2), 1);
  }
}

export function generateGroundTextures(scene: Phaser.Scene): void {
  for (let v = 0; v < 4; v += 1) {
    tex(scene, `t_grass${v}`, 32, 32, (g) => {
      g.fillStyle(C.grass);
      g.fillRect(0, 0, 32, 32);
      const r = rnd(31 + v);
      // 大块明暗：破掉均匀噪点铺成的“地毯感”
      g.fillStyle(C.grassDark, 0.26);
      g.fillCircle(4 + Math.floor(r() * 24), 4 + Math.floor(r() * 24), 9);
      g.fillStyle(C.grassLight, 0.2);
      g.fillCircle(4 + Math.floor(r() * 24), 4 + Math.floor(r() * 24), 7);
      // 成簇草叶：三两根一组，比散点更像草
      for (let i = 0; i < 8; i += 1) {
        const x = 2 + Math.floor(r() * 28);
        const y = 3 + Math.floor(r() * 26);
        g.fillStyle(r() > 0.5 ? C.grassLight : C.grassDark, 0.85);
        g.fillRect(x, y, 1, 2);
        g.fillRect(x + 1, y + 1, 1, 2);
        if (r() > 0.55) g.fillRect(x - 1, y + 1, 1, 2);
      }
      specks(g, 12, [C.grassDark, C.grassLight], 0, 0, 32, 32, 11 + v);
      if (v === 3) {
        g.fillStyle(0xf2e8d5);
        g.fillRect(8, 22, 2, 2);
        g.fillStyle(0xe8c85a);
        g.fillRect(23, 9, 2, 2);
      }
    });
  }

  tex(scene, 't_lawn0', 32, 32, (g) => {
    g.fillStyle(C.lawn);
    g.fillRect(0, 0, 32, 32);
    // 割草条纹：草坪最常见、也最能显质感
    g.fillStyle(0x4a7a38, 0.45);
    g.fillRect(0, 0, 32, 16);
    specks(g, 16, [0x4a7a38, C.grass], 0, 0, 32, 32, 71);
    g.fillStyle(0x4a7a38, 0.6);
    for (let i = 0; i < 5; i += 1) g.fillRect(3 + i * 6, 20 - (i % 2) * 9, 4, 1);
  });

  for (let v = 0; v < 4; v += 1) {
    tex(scene, `t_path${v}`, 32, 32, (g) => {
      g.fillStyle(C.dirt);
      g.fillRect(0, 0, 32, 32);
      const r = rnd(131 + v);
      g.fillStyle(C.dirtDark, 0.28);
      g.fillCircle(4 + Math.floor(r() * 24), 4 + Math.floor(r() * 24), 8);
      g.fillStyle(C.dirtLight, 0.24);
      g.fillCircle(4 + Math.floor(r() * 24), 4 + Math.floor(r() * 24), 7);
      specks(g, 20, [C.dirtDark, C.dirtLight, 0x8a6a4a], 0, 0, 32, 32, 101 + v);
      // 踩实的浅痕
      for (let i = 0; i < 3; i += 1) {
        g.fillStyle(0x9a8060, 0.5);
        g.fillRect(2 + Math.floor(r() * 24), 4 + Math.floor(r() * 24), 5, 1);
      }
    });
  }

  for (let v = 0; v < 3; v += 1) {
    tex(scene, `t_plaza${v}`, 32, 32, (g) => {
      // 大面积石材广场：先铺底，再叠极低对比的斑驳与细缝。
      // 关键是不让 32px 平铺边界形成可见网格——缝隙只出现在内部石板上，
      // 且明度差控制在 ~4/255。
      const r = rnd(211 + v * 17);
      g.fillStyle(0xd3c9b5).fillRect(0, 0, 32, 32);
      // 大块云斑，打散平铺感
      for (let i = 0; i < 5; i += 1) {
        g.fillStyle(r() > 0.5 ? 0xd8cfbb : 0xcec4b0, 0.55);
        g.fillCircle(Math.floor(r() * 32), Math.floor(r() * 32), 5 + Math.floor(r() * 7));
      }
      // 石板缝：错缝排布，2×2 大板，只画内侧缝，不贴纹理边界
      g.fillStyle(0xc6bca6, 0.5);
      g.fillRect(10, 0, 1, 40);
      g.fillRect(0, 12, 40, 1);
      g.fillStyle(0xe2d9c5, 0.35);
      g.fillRect(11, 0, 1, 40);
      g.fillRect(0, 13, 40, 1);
      // 石面颗粒
      specks(g, 22, [0xcac0aa, 0xdcd3bf, 0xc2b8a2], 0, 0, 32, 32, 231 + v);
      // 零星磨损与裂纹
      for (let i = 0; i < 2; i += 1) {
        g.fillStyle(0xbfb59f, 0.3);
        const x = Math.floor(r() * 24) + 2;
        const y = Math.floor(r() * 24) + 2;
        g.fillRect(x, y, 3 + Math.floor(r() * 4), 1);
        if (r() > 0.6) g.fillRect(x + 1, y + 1, 1, 2);
      }
    });
  }

  for (let v = 0; v < 3; v += 1) {
    tex(scene, `t_track${v}`, 32, 32, (g) => {
      g.fillStyle(C.track);
      g.fillRect(0, 0, 32, 32);
      specks(g, 30, [0x9a4a3e, 0xc06a58], 0, 0, 32, 32, 301 + v);
    });
    tex(scene, `t_court${v}`, 32, 32, (g) => {
      g.fillStyle(C.court);
      g.fillRect(0, 0, 32, 32);
      specks(g, 26, [0x4a7f6a, 0x6fa38a], 0, 0, 32, 32, 401 + v);
    });
  }

  for (let v = 0; v < 2; v += 1) {
    tex(scene, `t_water${v}`, 64, 64, (g) => {
      g.fillStyle(C.water);
      g.fillRect(0, 0, 64, 64);
      specks(g, 40, [C.waterDark, C.waterLight], 0, 0, 64, 64, 501 + v);
      g.fillStyle(C.waterLight, 0.7);
      for (let i = 0; i < 5; i += 1) {
        const y = 8 + i * 12 + (v ? 4 : 0);
        g.fillRect(6 + ((i * 13 + v * 7) % 20), y, 14, 1);
        g.fillRect(34 + ((i * 9 + v * 5) % 18), y + 4, 10, 1);
      }
      g.fillStyle(C.waterDark, 0.6);
      g.fillRect(20, 30 + v * 2, 18, 2);
    });
  }

  tex(scene, 't_wood', 32, 32, (g) => {
    g.fillStyle(0x9a6a44);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x845632);
    for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1);
    g.fillStyle(0xb07a4e, 0.5);
    for (let y = 2; y < 32; y += 8) g.fillRect(3 + (y % 5), y, 14, 1);
    specks(g, 10, [0x7a4e2e], 0, 0, 32, 32, 601);
  });
}

export interface CharacterPalette {
  shirt: number;
  hair: number;
  pants: number;
  skin: number;
  shoes: number;
}

export function generateCharacterTextures(
  scene: Phaser.Scene,
  prefix: string,
  palette: CharacterPalette,
): void {
  for (const dir of ['down', 'up', 'side'] as const) {
    for (let frame = 0; frame < 4; frame += 1) {
      tex(scene, `${prefix}_${dir}_${frame}`, 32, 48, (g) => {
        g.fillStyle(0x000000, 0.22);
        g.fillEllipse(16, 45, 22, 4);

        const bob = frame === 1 || frame === 3 ? -1 : 0;
        const legL = frame === 1 ? 2 : frame === 3 ? -2 : 0;
        const legR = -legL;
        const armSwing = frame === 1 ? 2 : frame === 3 ? -2 : 0;

        // 腿
        g.fillStyle(palette.shoes);
        g.fillRect(9 + legL, 41 + bob, 6, 3);
        g.fillRect(17 + legR, 41 + bob, 6, 3);
        g.fillStyle(palette.pants);
        g.fillRect(9 + legL, 33 + bob, 6, 9);
        g.fillRect(17 + legR, 33 + bob, 6, 9);
        g.fillStyle(0x000000, 0.18);
        g.fillRect(9 + legL, 33 + bob, 6, 1);

        // 躯干：深色描边 + 明暗两面，避免一块纯色
        g.fillStyle(C.outline);
        g.fillRect(7, 15 + bob, 18, 19);
        g.fillStyle(palette.shirt);
        g.fillRect(8, 16 + bob, 16, 17);
        g.fillStyle(0xffffff, 0.12);
        g.fillRect(8, 16 + bob, 5, 16);
        g.fillStyle(0x000000, 0.16);
        g.fillRect(21, 16 + bob, 3, 16);
        // 衣领
        g.fillStyle(0xffffff, 0.22);
        g.fillRect(12, 17 + bob, 8, 3);

        // 手臂
        g.fillStyle(C.outline);
        g.fillRect(4, 17 + bob + armSwing, 4, 13);
        g.fillRect(24, 17 + bob - armSwing, 4, 13);
        g.fillStyle(palette.skin);
        g.fillRect(5, 18 + bob + armSwing, 2, 11);
        g.fillRect(25, 18 + bob - armSwing, 2, 11);

        // 头
        g.fillStyle(C.outline);
        g.fillRect(9, 3 + bob, 14, 14);
        g.fillStyle(palette.skin);
        g.fillRect(10, 4 + bob, 12, 12);
        // 下巴阴影
        g.fillStyle(C.skinShade, 0.5);
        g.fillRect(10, 14 + bob, 12, 2);

        g.fillStyle(palette.hair);
        if (dir === 'down') {
          g.fillRect(9, 2 + bob, 14, 5);
          g.fillRect(9, 6 + bob, 3, 5);
          g.fillRect(20, 6 + bob, 3, 5);
          // 眼睛
          g.fillStyle(C.outline);
          g.fillRect(12, 9 + bob, 2, 3);
          g.fillRect(18, 9 + bob, 2, 3);
          g.fillStyle(0xffffff, 0.85);
          g.fillRect(12, 9 + bob, 1, 1);
          g.fillRect(18, 9 + bob, 1, 1);
          g.fillStyle(C.skinShade);
          g.fillRect(15, 13 + bob, 2, 1);
        } else if (dir === 'up') {
          g.fillRect(9, 2 + bob, 14, 12);
          g.fillStyle(C.skinShade, 0.6);
          g.fillRect(10, 13 + bob, 12, 1);
        } else {
          g.fillRect(9, 2 + bob, 14, 5);
          g.fillRect(9, 6 + bob, 9, 6);
          g.fillRect(9, 6 + bob, 3, 9);
          g.fillStyle(C.outline);
          g.fillRect(19, 9 + bob, 2, 3);
          g.fillStyle(C.skinShade);
          g.fillRect(22, 11 + bob, 2, 3);
        }
      });
    }
  }
}

export function createCharacterAnims(scene: Phaser.Scene, prefix: string): void {
  for (const dir of ['down', 'up', 'side'] as const) {
    const key = `${prefix}-walk-${dir}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: [0, 1, 0, 2].map((i) => ({ key: `${prefix}_${dir}_${i}` })),
      frameRate: 8,
      repeat: -1,
    });
  }
}

function canopy(
  g: G,
  cx: number,
  top: number,
  mid: number,
  light: number,
  dark: number,
): void {
  // 树冠：圆润外轮廓 + 分块受光，避免横条纹
  const blobs: [number, number, number][] = [
    [cx, top + 20, 26],
    [cx - 16, top + 30, 18],
    [cx + 15, top + 28, 17],
    [cx - 6, top + 44, 15],
    [cx + 9, top + 46, 13],
  ];
  for (const [bx, by, br] of blobs) g.fillStyle(dark).fillCircle(bx, by, br);
  for (const [bx, by, br] of blobs) g.fillStyle(mid).fillCircle(bx, by - 2, br - 3);
  // 受光面：左上一团高光，右侧压暗，制造体积
  g.fillStyle(light, 0.85);
  g.fillCircle(cx - 10, top + 18, 11);
  g.fillCircle(cx + 2, top + 12, 7);
  g.fillStyle(light, 0.5);
  g.fillCircle(cx + 16, top + 34, 7);
  // 叶簇：外缘的碎叶，剪影不再是一个整圆
  const r = rnd(cx * 13 + top);
  for (let i = 0; i < 16; i += 1) {
    const a = r() * Math.PI * 2;
    const rad = 16 + r() * 14;
    const x = cx + Math.cos(a) * rad;
    const y = top + 30 + Math.sin(a) * rad * 0.85;
    g.fillStyle(r() > 0.45 ? mid : light, 0.9);
    g.fillCircle(x, y, 2 + r() * 2);
  }
  // 顶部暗边强调外轮廓
  g.fillStyle(dark, 0.55);
  g.fillCircle(cx + 6, top + 10, 9);
}

function trunk(g: G, cx: number, top: number, bottom: number): void {
  g.fillStyle(C.woodDark);
  g.fillRect(cx - 5, top, 10, bottom - top);
  g.fillStyle(C.wood);
  g.fillRect(cx - 3, top, 6, bottom - top);
  g.fillStyle(C.woodLight, 0.55);
  g.fillRect(cx - 2, top + 3, 2, bottom - top - 6);
  // 树根处加宽，避免树干像根竖条
  g.fillStyle(C.woodDark);
  g.fillRect(cx - 7, bottom - 5, 14, 5);
}

export function generatePropTextures(scene: Phaser.Scene): void {
  tex(scene, 'p_ginkgo', 64, 84, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(32, 80, 36, 7);
    trunk(g, 32, 48, 79);
    canopy(g, 32, 6, C.ginkgo, C.ginkgoLight, C.ginkgoDark);
    g.fillStyle(0xe8d86a, 0.8);
    g.fillRect(20, 20, 3, 3);
    g.fillRect(42, 28, 3, 3);
    g.fillRect(30, 44, 2, 2);
  });

  tex(scene, 'p_tree', 64, 84, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(32, 80, 36, 7);
    trunk(g, 32, 50, 79);
    canopy(g, 32, 8, C.leaf, C.leafLight, C.leafDark);
  });

  tex(scene, 'p_pine', 48, 88, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(24, 84, 28, 6);
    trunk(g, 24, 66, 83);
    const layers = [
      [24, 4, 8],
      [32, 16, 9],
      [40, 30, 10],
      [34, 46, 9],
    ] as const;
    for (const [w, y, h] of layers) {
      g.fillStyle(C.pineDark);
      g.fillRect(24 - w / 2, y, w, h + 8);
      g.fillStyle(C.pine);
      g.fillRect(24 - w / 2 + 3, y, w - 6, h + 5);
      g.fillStyle(C.pineLight);
      g.fillRect(24 - w / 2 + 6, y + 2, 5, h);
    }
  });

  tex(scene, 'p_bush', 36, 26, (g) => {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(18, 23, 28, 5);
    g.fillStyle(C.leafDark);
    g.fillRect(3, 10, 30, 12);
    g.fillRect(7, 6, 22, 8);
    g.fillStyle(C.leaf);
    g.fillRect(5, 9, 26, 9);
    g.fillRect(10, 5, 16, 6);
    g.fillStyle(C.leafLight);
    g.fillRect(9, 7, 8, 5);
    g.fillRect(20, 12, 7, 4);
  });

  tex(scene, 'p_flower', 32, 24, (g) => {
    g.fillStyle(C.grassDark, 0.8);
    g.fillRect(4, 16, 24, 4);
    for (let i = 0; i < 4; i += 1) {
      const x = 6 + i * 6;
      g.fillStyle(C.leaf);
      g.fillRect(x, 12, 2, 6);
      g.fillStyle([0xf2e8d5, 0xe8a0b0, 0xe8c85a, 0xb0a0e0][i]);
      g.fillRect(x - 1, 9, 4, 4);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(x, 10, 1, 1);
    }
  });

  tex(scene, 'p_lamp', 16, 60, (g) => {
    // 中式庭院灯：石基 + 灯柱 + 六角灯罩 + 顶盖
    g.fillStyle(0x000000, 0.18).fillEllipse(8, 57, 13, 4);
    g.fillStyle(0x8f8778).fillRect(4, 51, 8, 7);
    g.fillStyle(0xa89f8e).fillRect(5, 51, 6, 3);
    g.fillStyle(0x3a3a3a).fillRect(6, 14, 4, 38);
    g.fillStyle(0x55554f).fillRect(6, 14, 1, 38);
    g.fillStyle(0x3a3a3a).fillRect(4, 46, 8, 3);
    g.fillStyle(0x2e2e2a).fillRect(2, 8, 12, 7);
    g.fillStyle(0xf2d27a).fillRect(3, 9, 10, 5);
    g.fillStyle(0xfff2c0).fillRect(5, 10, 6, 3);
    g.fillStyle(0x2e2e2a).fillRect(1, 6, 14, 3);
    g.fillStyle(0x46423d).fillRect(4, 3, 8, 3);
    g.fillStyle(0x2e2e2a).fillRect(6, 1, 4, 2);
  });

  tex(scene, 'p_bench', 48, 30, (g) => {
    // 木条长椅：三条座板 + 两条靠背板 + 铸铁支腿
    g.fillStyle(0x000000, 0.18).fillEllipse(24, 28, 42, 4);
    g.fillStyle(0x3a3530).fillRect(4, 20, 4, 8);
    g.fillRect(40, 20, 4, 8);
    g.fillRect(6, 12, 3, 8);
    g.fillRect(39, 12, 3, 8);
    for (let i = 0; i < 3; i += 1) {
      g.fillStyle(C.woodDark).fillRect(3, 18 + i * 3, 42, 3);
      g.fillStyle(C.wood).fillRect(3, 18 + i * 3, 42, 2);
      g.fillStyle(C.woodLight, 0.6).fillRect(4, 18 + i * 3, 40, 1);
    }
    for (let i = 0; i < 2; i += 1) {
      g.fillStyle(C.woodDark).fillRect(5, 7 + i * 5, 38, 4);
      g.fillStyle(C.wood).fillRect(5, 7 + i * 5, 38, 3);
      g.fillStyle(C.woodLight, 0.5).fillRect(6, 7 + i * 5, 36, 1);
    }
  });

  tex(scene, 'p_sign', 32, 40, (g) => {
    // 导览牌：金属立杆 + 深色牌面 + 校徽色横条
    g.fillStyle(0x000000, 0.18).fillEllipse(16, 37, 20, 4);
    g.fillStyle(0x6a6156).fillRect(14, 14, 4, 23);
    g.fillStyle(0x8a8175).fillRect(14, 14, 1, 23);
    g.fillStyle(0x3a3530).fillRect(2, 1, 28, 19);
    g.fillStyle(0x4a5a52).fillRect(3, 2, 26, 17);
    g.fillStyle(0xece4d4).fillRect(5, 5, 22, 2);
    g.fillRect(5, 9, 16, 2);
    g.fillRect(5, 13, 20, 2);
    g.fillStyle(C.red).fillRect(3, 16, 26, 3);
  });

  tex(scene, 'p_stone', 72, 54, (g) => {
    // 校名石刻：夯土台 + 米色石身 + 阴刻字槽 + 侧面露明
    g.fillStyle(0x000000, 0.2).fillEllipse(36, 50, 64, 8);
    g.fillStyle(0x8f8778).fillRect(2, 32, 68, 20);
    g.fillStyle(0xa89f8e).fillRect(6, 30, 60, 16);
    g.fillStyle(0xc9c0ad).fillRect(9, 8, 54, 26);
    g.fillStyle(0xdcd3c0).fillRect(11, 10, 50, 20);
    g.fillStyle(0xb4aa97).fillRect(11, 30, 50, 4);
    g.fillStyle(0x8f8778);
    g.fillRect(14, 15, 42, 2);
    g.fillRect(14, 20, 30, 2);
    g.fillRect(14, 25, 36, 2);
    g.fillStyle(0xece4d4, 0.5).fillRect(11, 10, 50, 2);
    g.fillStyle(0xa89f8e).fillRect(63, 12, 6, 22);
  });

  tex(scene, 'p_fence', 32, 26, (g) => {
    g.fillStyle(C.woodDark);
    g.fillRect(2, 6, 4, 18);
    g.fillRect(26, 6, 4, 18);
    g.fillStyle(C.wood);
    g.fillRect(0, 9, 32, 3);
    g.fillRect(0, 17, 32, 3);
    g.fillStyle(C.woodLight);
    g.fillRect(0, 9, 32, 1);
  });

  tex(scene, 'p_flag', 44, 68, (g) => {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(20, 65, 16, 4);
    g.fillStyle(0x9a9a9a);
    g.fillRect(19, 4, 3, 62);
    g.fillStyle(0xc9a24a);
    g.fillRect(17, 62, 7, 4);
    g.fillStyle(C.red);
    g.fillRect(21, 6, 22, 13);
    g.fillStyle(0xe8c85a);
    g.fillRect(25, 9, 3, 3);
    g.fillRect(29, 13, 2, 2);
  });

  tex(scene, 'p_pavilion', 72, 76, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(36, 72, 60, 8);
    g.fillStyle(0xb8ab95);
    g.fillRect(8, 62, 56, 10);
    g.fillStyle(0xd8cbb4);
    g.fillRect(10, 62, 52, 4);
    g.fillStyle(C.red);
    g.fillRect(13, 30, 5, 34);
    g.fillRect(54, 30, 5, 34);
    g.fillStyle(C.redLight);
    g.fillRect(14, 30, 2, 34);
    g.fillRect(55, 30, 2, 34);
    g.fillStyle(C.roof);
    g.fillRect(2, 20, 68, 12);
    g.fillStyle(C.roofAlt);
    g.fillRect(6, 14, 60, 8);
    g.fillRect(12, 8, 48, 7);
    g.fillStyle(C.roofRidge);
    g.fillRect(10, 6, 52, 4);
    g.fillStyle(C.roofRidge);
    g.fillRect(0, 18, 8, 4);
    g.fillRect(64, 18, 8, 4);
    g.fillStyle(C.woodDark);
    g.fillRect(18, 44, 32, 4);
  });

  tex(scene, 'p_lotus', 28, 18, (g) => {
    g.fillStyle(0x3f7f4a);
    g.fillEllipse(9, 13, 14, 6);
    g.fillEllipse(19, 14, 12, 5);
    g.fillStyle(0x5fa35a);
    g.fillEllipse(9, 12, 10, 4);
    g.fillStyle(0xe8a0b0);
    g.fillRect(17, 5, 4, 6);
    g.fillRect(15, 7, 8, 3);
    g.fillStyle(0xf2c8d0);
    g.fillRect(18, 6, 2, 3);
  });
}

export function ensureBuildingTexture(scene: Phaser.Scene, b: BuildingDef): string {
  const key = `bld_${b.id}`;
  if (scene.textures.exists(key)) return key;
  const w = b.rect.w;
  const h = b.rect.h;
  tex(scene, key, w, h, (g) => {
    if (b.id === 'gate_south') {
      g.fillStyle(C.roofRidge);
      g.fillRect(4, 0, w - 8, 16);
      g.fillStyle(C.roof);
      g.fillRect(0, 6, w, 14);
      g.fillStyle(C.roofAlt);
      g.fillRect(10, 4, w - 20, 4);
      g.fillStyle(C.red);
      g.fillRect(12, 20, w - 24, 22);
      g.fillStyle(C.gold);
      g.fillRect(16, 26, w - 32, 3);
      g.fillRect(16, 34, w - 32, 3);
      g.fillStyle(C.red);
      g.fillRect(40, 40, 46, h - 40);
      g.fillRect(w - 86, 40, 46, h - 40);
      g.fillStyle(C.redLight);
      g.fillRect(44, 42, 8, h - 44);
      g.fillRect(w - 82, 42, 8, h - 44);
      g.fillStyle(0x8f8778);
      g.fillRect(34, h - 12, 58, 12);
      g.fillRect(w - 92, h - 12, 58, 12);
      return;
    }
    g.fillStyle(0x000000, 0.16);
    g.fillRect(6, h - 10, w - 12, 10);

    if (b.style === 'chinese') {
      // 比例决定“像不像中式教学楼”：屋顶约占 3 成、墙身按开间分割、
      // 窗随开间成排、底部有台基。原来的做法是巨大墙面 + 稀疏窗 + 通高红柱，
      // 所以远景看就是一块米色板。
      const roofH = Math.round(Math.min(150, Math.max(60, h * 0.29)));
      const plinthH = Math.round(Math.max(9, Math.min(22, h * 0.055)));
      const eaveH = Math.round(Math.max(8, Math.min(16, h * 0.03)));
      const roofDark = shade(C.roof, -0.26);
      const roofLite = shade(C.roof, 0.2);
      const bodyTop = roofH;
      const bodyBottom = h - plinthH;
      const bodyH = bodyBottom - bodyTop;
      const r = rnd(w * 7 + h);

      // ---- 屋顶：正脊 → 筒瓦（竖条错缝，不是横条纹）→ 檐口起翘 ----
      g.fillStyle(C.roofRidge).fillRect(0, 0, w, 7);
      g.fillStyle(C.roofAlt).fillRect(0, 7, w, 4);
      g.fillStyle(C.roof).fillRect(0, 11, w, roofH - 11);
      const tileW = 9;
      let rowIdx = 0;
      for (let y = 15; y < roofH - eaveH; y += 9) {
        const off = rowIdx % 2 === 0 ? 0 : tileW / 2;
        for (let x = off; x < w; x += tileW) {
          g.fillStyle(roofLite, 0.85).fillRect(Math.round(x), y, 3, 7);
          g.fillStyle(roofDark, 0.6).fillRect(Math.round(x) + 3, y, 1, 7);
        }
        g.fillStyle(roofDark, 0.3).fillRect(0, y + 7, w, 1);
        rowIdx += 1;
      }
      g.fillStyle(C.roofRidge).fillRect(0, roofH - eaveH, w, eaveH);
      g.fillStyle(0x000000, 0.22).fillRect(0, roofH - 3, w, 3);
      g.fillStyle(C.red).fillRect(0, roofH - 2, w, 2);
      // 檐角起翘
      for (let i = 0; i < 3; i += 1) {
        g.fillStyle(C.roofRidge);
        g.fillRect(-1 - i * 4, roofH - eaveH - i * 3, 9, 4);
        g.fillRect(w - 8 + i * 4, roofH - eaveH - i * 3, 9, 4);
      }

      // ---- 墙身 ----
      g.fillStyle(C.wallShade).fillRect(0, bodyTop, w, bodyH);
      g.fillStyle(C.wall).fillRect(0, bodyTop, w, bodyH - 6);
      g.fillStyle(0x000000, 0.18).fillRect(0, bodyTop, w, Math.max(6, Math.round(bodyH * 0.04)));
      for (let i = 0; i < Math.round(w * bodyH * 0.0004); i += 1) {
        g.fillStyle(0xcabfa9, 0.32);
        g.fillRect(
          4 + Math.floor(r() * (w - 8)),
          bodyTop + 10 + Math.floor(r() * (bodyH - 20)),
          2,
          2,
        );
      }

      const bays = Math.max(3, Math.round(w / 132));
      const bayW = w / bays;
      const colW = Math.max(7, Math.round(w * 0.014));
      const rows = Math.max(1, Math.round((bodyH - 26) / 96));
      const rowH = (bodyH - 24) / rows;
      const winW = Math.min(58, Math.round(bayW * 0.5));
      const winH = Math.min(52, Math.round(rowH * 0.58));

      for (let row = 0; row < rows; row += 1) {
        const y = Math.round(bodyTop + 12 + row * rowH + (rowH - winH) / 2);
        for (let bay = 0; bay < bays; bay += 1) {
          const x = Math.round(bay * bayW + (bayW - winW) / 2);
          g.fillStyle(0x3a2a20).fillRect(x - 3, y - 3, winW + 6, winH + 6);
          g.fillStyle(0x5d7f92).fillRect(x, y, winW, winH);
          g.fillStyle(0x86adb9).fillRect(x, y, winW, Math.round(winH * 0.42));
          g.fillStyle(0xc3dde4, 0.5).fillRect(x + 3, y + 3, Math.round(winW * 0.32), Math.round(winH * 0.3));
          g.fillStyle(0x3a2a20);
          g.fillRect(x + winW / 2 - 1, y, 3, winH);
          g.fillRect(x, y + Math.round(winH * 0.55) - 1, winW, 3);
          g.fillStyle(0xd8cbb4).fillRect(x - 5, y + winH + 2, winW + 10, 4);
          g.fillStyle(0x000000, 0.14).fillRect(x - 5, y + winH + 6, winW + 10, 2);
        }
      }

      // 红柱：立在开间缝上，到台基为止，柱顶压在檐下
      for (let bay = 0; bay <= bays; bay += 1) {
        const x = Math.round(bay * bayW - colW / 2);
        g.fillStyle(C.red).fillRect(x, bodyTop, colW, bodyH);
        g.fillStyle(C.redLight).fillRect(x + 1, bodyTop, Math.max(2, Math.round(colW * 0.34)), bodyH);
        g.fillStyle(0x000000, 0.16).fillRect(x + colW - 2, bodyTop, 2, bodyH);
        g.fillStyle(0xd8cbb4).fillRect(x - 2, bodyBottom - 7, colW + 4, 7);
      }

      // ---- 台基 ----
      g.fillStyle(0xbfb49e).fillRect(0, bodyBottom, w, plinthH);
      g.fillStyle(0xd8cbb4).fillRect(0, bodyBottom, w, 3);
      g.fillStyle(0x8f8574, 0.75).fillRect(0, h - 3, w, 3);

      if (b.door) {
        const dx = b.door.x - b.rect.x;
        const doorH = Math.min(Math.round(bodyH * 0.46), 96);
        const doorTop = bodyBottom - doorH;
        // 台阶
        g.fillStyle(0xb8ab95).fillRect(dx - 22, h - 9, b.door.w + 44, 9);
        g.fillStyle(0xd8cbb4).fillRect(dx - 16, h - 14, b.door.w + 32, 7);
        // 门洞 + 朱红大门 + 铜钉
        g.fillStyle(0x3a2a20).fillRect(dx - 6, doorTop - 6, b.door.w + 12, doorH + 6);
        g.fillStyle(C.red).fillRect(dx, doorTop, b.door.w, doorH);
        g.fillStyle(C.redLight).fillRect(dx + 3, doorTop + 3, Math.round(b.door.w / 2) - 4, doorH - 6);
        g.fillStyle(shade(C.red, -0.32)).fillRect(dx + Math.round(b.door.w / 2) - 1, doorTop, 2, doorH);
        g.fillStyle(C.gold);
        for (let i = 0; i < 3; i += 1) {
          for (let j = 0; j < 2; j += 1) {
            g.fillRect(dx + 7 + j * 15, doorTop + 14 + i * 17, 3, 3);
            g.fillRect(dx + b.door.w - 10 - j * 15, doorTop + 14 + i * 17, 3, 3);
          }
        }
        // 门罩 + 匾额
        g.fillStyle(C.roofAlt).fillRect(dx - 22, doorTop - 30, b.door.w + 44, 8);
        g.fillStyle(C.roofRidge).fillRect(dx - 16, doorTop - 25, b.door.w + 32, 19);
        g.fillStyle(C.gold).fillRect(dx - 10, doorTop - 22, b.door.w + 20, 13);
        g.fillStyle(0x5a3a1a).fillRect(dx + 5, doorTop - 19, b.door.w - 10, 7);
        g.fillStyle(0x000000, 0.2).fillRect(dx - 16, doorTop - 6, b.door.w + 32, 3);
      }
    } else if (b.style === 'modern') {
      // 现代楼：石材横带 + 玻璃幕墙分格 + 竖明框 + 女儿墙收头 + 首层门厅雨棚。
      const parapet = Math.round(Math.max(10, Math.min(26, h * 0.07)));
      const baseH = Math.round(Math.max(18, Math.min(40, h * 0.11)));
      const bandH = Math.max(4, Math.round(h * 0.018));
      const glassTop = parapet + 4;
      const glassBottom = h - baseH;
      const r = rnd(w * 17 + h * 5);

      // 石材底色
      g.fillStyle(0xb9b4aa).fillRect(0, 0, w, h);
      g.fillStyle(0xc6c1b6).fillRect(0, 0, w, parapet);
      g.fillStyle(0xa8a298).fillRect(0, parapet - 4, w, 4);

      // 玻璃幕墙
      const mullion = 46;
      g.fillStyle(0x8fa4ae).fillRect(0, glassTop, w, Math.max(4, glassBottom - glassTop));
      for (let y = glassTop + 6; y < glassBottom - 8; y += 34) {
        for (let x = 4; x < w - 8; x += mullion) {
          const gw = Math.min(mullion - 5, w - 8 - x);
          if (gw < 8) continue;
          g.fillStyle(0x6d8b98).fillRect(x, y, gw, 28);
          g.fillStyle(0x9dbcc6).fillRect(x, y, gw, 12);
          g.fillStyle(0xd2e6ec, 0.45).fillRect(x + 2, y + 2, Math.round(gw * 0.34), 7);
          if (r() > 0.7) g.fillStyle(0x3f5862, 0.55).fillRect(x + 3, y + 17, gw - 6, 9);
        }
        g.fillStyle(0x5c6f78).fillRect(0, y + 28, w, 3);
      }
      // 竖明框
      for (let x = 0; x < w; x += mullion) g.fillStyle(0xd8e0e2).fillRect(x, glassTop, 3, glassBottom - glassTop);
      // 层间横带
      for (let y = glassTop + 34; y < glassBottom; y += 34) {
        g.fillStyle(0xc8c2b6).fillRect(0, y, w, bandH);
        g.fillStyle(0x000000, 0.12).fillRect(0, y + bandH, w, 2);
      }

      // 首层基座与门厅
      g.fillStyle(0x4a565c).fillRect(0, glassBottom, w, baseH);
      g.fillStyle(0x6a7880).fillRect(0, glassBottom, w, 4);
      g.fillStyle(0x2a343a).fillRect(0, h - 5, w, 5);
      for (let x = 8; x < w - 8; x += 70) {
        g.fillStyle(0x3a464c).fillRect(x, glassBottom + 6, 52, baseH - 14);
        g.fillStyle(0x8fb4be, 0.5).fillRect(x + 2, glassBottom + 8, 48, 8);
      }
      if (b.door) {
        const dx = b.door.x - b.rect.x;
        const dh = Math.max(40, Math.min(70, Math.round(h * 0.26)));
        const dtop = h - dh - 4;
        g.fillStyle(0x2a343a).fillRect(dx - 10, dtop - 12, b.door.w + 20, dh + 16);
        g.fillStyle(0x9fd0dd).fillRect(dx, dtop, b.door.w, dh);
        g.fillStyle(0xd8f0f4, 0.5).fillRect(dx + 3, dtop + 3, Math.round(b.door.w * 0.3), dh - 8);
        g.fillStyle(0x2a343a).fillRect(dx + b.door.w / 2 - 1, dtop, 3, dh);
        // 雨棚
        g.fillStyle(0x3a464c).fillRect(dx - 26, dtop - 22, b.door.w + 52, 9);
        g.fillStyle(0x5a6870).fillRect(dx - 26, dtop - 22, b.door.w + 52, 3);
        g.fillStyle(0x000000, 0.22).fillRect(dx - 20, dtop - 13, b.door.w + 40, 3);
      }
    } else if (b.style === 'dorm') {
      // 宿舍：清水砖墙 + 每层阳台（外挑板 + 栏板）+ 窗 + 空调外机 + 屋面女儿墙。
      const parapet = Math.round(Math.max(9, Math.min(20, h * 0.06)));
      const r = rnd(w * 23 + h * 11);
      const brick = 0xb0705a;
      const brickDark = shade(brick, -0.16);
      const brickLite = shade(brick, 0.12);

      g.fillStyle(brick).fillRect(0, 0, w, h);
      // 砖缝：横缝密、竖缝错缝
      for (let y = 0; y < h; y += 7) g.fillStyle(brickDark, 0.5).fillRect(0, y, w, 1);
      let row = 0;
      for (let y = 0; y < h; y += 7) {
        const off = row % 2 === 0 ? 0 : 9;
        for (let x = off; x < w; x += 18) g.fillStyle(brickDark, 0.4).fillRect(x, y, 1, 7);
        row += 1;
      }
      for (let i = 0; i < Math.round(w * h * 0.00025); i += 1) {
        g.fillStyle(r() > 0.5 ? brickLite : brickDark, 0.5);
        g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 3, 1);
      }

      // 女儿墙
      g.fillStyle(shade(brick, -0.3)).fillRect(0, 0, w, parapet);
      g.fillStyle(0xd8cbb4).fillRect(0, parapet - 3, w, 3);

      const floors = Math.max(2, Math.round((h - parapet - 26) / 58));
      const floorH = (h - parapet - 26) / floors;
      const winW = 26;
      const gap = Math.max(46, Math.round(w / Math.max(2, Math.round(w / 78))));
      for (let f = 0; f < floors; f += 1) {
        const top = parapet + f * floorH + 12;
        // 阳台外挑板（贯穿整层，制造横向节奏）
        g.fillStyle(0xd8cbb4).fillRect(0, top + floorH - 20, w, 5);
        g.fillStyle(0x000000, 0.18).fillRect(0, top + floorH - 15, w, 3);
        for (let x = 8; x < w - winW - 4; x += gap) {
          // 阳台栏板
          g.fillStyle(0xcfc5b2).fillRect(x - 6, top + floorH - 26, winW + 16, 8);
          g.fillStyle(0x8f8574).fillRect(x - 6, top + floorH - 19, winW + 16, 2);
          // 窗
          g.fillStyle(0x3a2a20).fillRect(x, top, winW, 30);
          g.fillStyle(0x6f8fa0).fillRect(x + 2, top + 2, winW - 4, 26);
          g.fillStyle(0xc8d8dc, 0.5).fillRect(x + 4, top + 4, 10, 9);
          g.fillStyle(0x3a2a20).fillRect(x + winW / 2 - 1, top + 2, 2, 26);
          // 窗台 + 空调外机
          g.fillStyle(0xd8cbb4).fillRect(x - 3, top + 30, winW + 6, 3);
          g.fillStyle(0x9aa8ac).fillRect(x + winW + 6, top + 10, 14, 16);
          g.fillStyle(0x7a8a8e).fillRect(x + winW + 7, top + 11, 12, 5);
          g.fillStyle(0xc8d0d2, 0.6).fillRect(x + winW + 8, top + 18, 10, 2);
          if (r() > 0.55) {
            g.fillStyle(0xe8dcc0, 0.7).fillRect(x - 4, top + floorH - 32, 20, 6);
          }
        }
      }
      if (b.door) {
        const dx = b.door.x - b.rect.x;
        const dh = Math.min(52, Math.round(floorH * 0.8));
        const dtop = h - dh - 6;
        g.fillStyle(0x3a2a20).fillRect(dx - 8, dtop - 10, b.door.w + 16, dh + 10);
        g.fillStyle(0x6a4a3a).fillRect(dx, dtop, b.door.w, dh);
        g.fillStyle(0x8a6248).fillRect(dx + 3, dtop + 3, Math.round(b.door.w * 0.42), dh - 6);
        g.fillStyle(0xd8cbb4).fillRect(dx - 14, dtop - 18, b.door.w + 28, 8);
        g.fillStyle(0x000000, 0.2).fillRect(dx - 14, dtop - 10, b.door.w + 28, 3);
        g.fillStyle(0xd8cbb4).fillRect(dx - 18, h - 6, b.door.w + 36, 6);
      }
    } else {
      // 兜底（stadium 等）：看台 + 座椅条纹
      const steps = Math.max(4, Math.round(h / 22));
      g.fillStyle(0x8a827a).fillRect(0, 0, w, h);
      for (let i = 0; i < steps; i += 1) {
        const y = i * (h / steps);
        g.fillStyle(i % 2 === 0 ? 0x9a928a : 0x7a726a).fillRect(0, y, w, h / steps - 2);
        g.fillStyle(0x000000, 0.2).fillRect(0, y + h / steps - 2, w, 2);
        for (let x = 6; x < w - 8; x += 22) {
          g.fillStyle([0x7a2e2a, 0x3f6a8a, 0x5a6a3a][i % 3], 0.8).fillRect(x, y + 4, 12, 8);
        }
      }
      g.fillStyle(0x5a534a).fillRect(0, 0, w, 16);
      g.fillStyle(0xd8cbb4).fillRect(0, 14, w, 3);
    }
  });
  return key;
}

function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (v: number): number => {
    const out = amount >= 0 ? v + (255 - v) * amount : v * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

/**
 * 室内家具贴图：按 label 猜形制，用描边 + 侧面 + 顶面 + 面板线做出体积，
 * 替掉原来的纯色矩形。相同 (label,color,w,h) 只生成一次。
 */
export function ensureFurnitureTexture(
  scene: Phaser.Scene,
  f: { rect: { w: number; h: number }; color: number; label?: string },
): string {
  const w = Math.round(f.rect.w);
  const h = Math.round(f.rect.h);
  const key = `fur_${f.label ?? 'x'}_${f.color}_${w}_${h}`;
  if (scene.textures.exists(key)) return key;

  const base = f.color;
  const top = shade(base, 0.22);
  const edge = shade(base, 0.42);
  const dark = shade(base, -0.4);
  const side = shade(base, -0.18);

  tex(scene, key, w, h, (g) => {
    const label = f.label ?? '';
    // 落地阴影
    g.fillStyle(0x000000, 0.2);
    g.fillRect(4, h - 5, w - 4, 5);

    if (label.includes('书架') || label.includes('货架') || label.includes('展')) {
      // 书架：外框 + 多层隔板 + 书脊
      g.fillStyle(dark).fillRect(0, 0, w, h);
      g.fillStyle(base).fillRect(2, 2, w - 4, h - 4);
      const rows = Math.max(2, Math.floor((h - 8) / 18));
      const rowH = (h - 8) / rows;
      const r = rnd(w * 31 + h * 7 + base);
      for (let i = 0; i < rows; i += 1) {
        const y = 4 + i * rowH;
        g.fillStyle(shade(base, -0.34)).fillRect(3, y + rowH - 2, w - 6, 2);
        let x = 5;
        while (x < w - 7) {
          const bw = 2 + Math.floor(r() * 3);
          const bh = rowH - 6 - Math.floor(r() * 4);
          const bookColors = [0x8a3b34, 0x3f6a8a, 0x6a7a3a, 0x9a7b3a, 0x7a4a6a, 0x5a6a6a];
          g.fillStyle(bookColors[Math.floor(r() * bookColors.length)]);
          g.fillRect(x, y + rowH - 4 - bh, Math.min(bw, w - 6 - x), bh);
          x += bw + 1;
        }
      }
      g.fillStyle(edge, 0.6).fillRect(2, 2, w - 4, 2);
      return;
    }

    if (label.includes('桌') || label.includes('台') || label.includes('窗口')) {
      // 桌子：顶面 + 前立面 + 桌腿
      g.fillStyle(dark).fillRect(0, h * 0.34, w, h * 0.66);
      g.fillStyle(side).fillRect(2, h * 0.34, w - 4, h * 0.66 - 4);
      g.fillStyle(top).fillRect(0, h * 0.2, w, h * 0.34);
      g.fillStyle(edge).fillRect(0, h * 0.2, w, 2);
      g.fillStyle(dark, 0.35).fillRect(0, h * 0.5, w, 3);
      // 桌上小物：纸张与杯子
      const r = rnd(w * 13 + h * 5);
      g.fillStyle(0xf2e8d5, 0.9);
      g.fillRect(6 + Math.floor(r() * (w - 24)), h * 0.24, 10, 7);
      g.fillStyle(0xd8cbb4);
      if (w > 120) g.fillRect(w / 2, h * 0.22, 6, 6);
      return;
    }

    if (label.includes('床')) {
      g.fillStyle(dark).fillRect(0, 0, w, h);
      g.fillStyle(top).fillRect(2, 2, w - 4, h * 0.42);
      g.fillStyle(base).fillRect(2, h * 0.42, w - 4, h * 0.55);
      g.fillStyle(0xf2e8d5).fillRect(4, 4, w * 0.3, h * 0.32);
      g.fillStyle(dark, 0.5).fillRect(2, h * 0.42, w - 4, 2);
      return;
    }

    if (label.includes('阶') || label.includes('教室') || label.includes('路演') || label.includes('孵化')) {
      // 阶梯教室 / 场地：地板 + 分区线 + 座位
      g.fillStyle(dark).fillRect(0, 0, w, h);
      g.fillStyle(base, 0.95).fillRect(2, 2, w - 4, h - 4);
      const seats = Math.max(2, Math.floor(w / 22));
      for (let i = 0; i < seats; i += 1) {
        const x = 5 + i * ((w - 10) / seats);
        g.fillStyle(shade(base, 0.2)).fillRect(x, h * 0.42, 11, 8);
        g.fillStyle(dark, 0.5).fillRect(x, h * 0.42 + 8, 11, 2);
      }
      g.fillStyle(edge, 0.5).fillRect(0, 0, w, 3);
      return;
    }

    // 通用柜体：描边 + 面板 + 拉手
    g.fillStyle(dark).fillRect(0, 0, w, h);
    g.fillStyle(base).fillRect(2, 2, w - 4, h - 4);
    g.fillStyle(top, 0.9).fillRect(2, 2, w - 4, 3);
    g.fillStyle(side).fillRect(2, h - 10, w - 4, 8);
    g.fillStyle(dark, 0.35).fillRect(w / 2 - 1, 6, 2, h - 16);
    g.fillStyle(edge, 0.8).fillRect(w / 2 - 6, h / 2 - 2, 5, 2);
    g.fillStyle(edge, 0.8).fillRect(w / 2 + 2, h / 2 - 2, 5, 2);
  });
  return key;
}

export const PROP_KINDS: PropKind[] = [
  'ginkgo',
  'pine',
  'tree',
  'bush',
  'flower',
  'lamp',
  'bench',
  'sign',
  'fence',
  'flag',
  'pavilion',
  'lotus',
];
