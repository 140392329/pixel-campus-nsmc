import Phaser from 'phaser';
import { CAMERA_ZOOM, GAME_H, GAME_W, INTERACT_DIST, PLAYER_SPEED, prefersReducedMotion } from '../config';
import { CAMPUS_CORE, INTERIORS } from '../data/campus';
import { NPCS } from '../data/npcs';
import { ClockSystem } from '../systems/ClockSystem';
import { loadGame, saveGame, type SaveData } from '../systems/SaveManager';
import { loadSettings } from '../systems/Settings';
import { resolveNpcState } from '../npc/schedule';
import { pickInteractable } from '../npc/interaction';
import { buildSystemPrompt, buildUserMessage } from '../dialog/prompt';
import { streamChat } from '../dialog/llmClient';
import { getMemory, pushTurn } from '../dialog/memory';
import { ensureFurnitureTexture } from '../art/textures';
import { ensureBuildingBox } from '../art/pseudo3d';
import type { BuildingDef, Facing, InteriorDef, NpcRuntimeState, Rect, Terrain } from '../types';
import type { Hud } from '../ui/hud';
import type { DialogPanel } from '../ui/dialogPanel';
import type { SettingsPanel } from '../ui/settingsPanel';

interface UiBundle {
  hud: Hud;
  dialog: DialogPanel;
  settings: SettingsPanel;
  help: unknown;
}

interface DoorRuntime {
  rect: Rect;
  target: string;
  spawn: string;
}

type Keys = Record<string, Phaser.Input.Keyboard.Key>;

const BRIDGE: Rect = { x: 1490, y: 1760, w: 212, h: 260 };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function styleColors(style: BuildingDef['style']): { wall: number; roof: number; trim: number } {
  switch (style) {
    case 'modern':
      return { wall: 0x9fb4bc, roof: 0x5a6d76, trim: 0x5a7d8c };
    case 'dorm':
      return { wall: 0xd8c8b0, roof: 0x7a5a4a, trim: 0xa8835f };
    case 'stadium':
      return { wall: 0xb8a080, roof: 0x8d6b53, trim: 0x6d5a4f };
    default:
      return { wall: 0xe8e0d0, roof: 0x5f5148, trim: 0x7a2e2a };
  }
}

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Keys;
  private clock = new ClockSystem();
  private mapId = 'campus_core';
  private interior: InteriorDef | null = null;
  private colliders: Phaser.GameObjects.GameObject[] = [];
  private mapLayer: Phaser.GameObjects.GameObject[] = [];
  private npcs: NpcRuntimeState[] = [];
  private npcSprites = new Map<string, Phaser.Physics.Arcade.Sprite>();
  private anchorMap = new Map(CAMPUS_CORE.anchors.map((a) => [a.id, a]));
  private doors: DoorRuntime[] = [];
  private npcScheduleTimer = 0;
  private triggerCooldown = 0;
  private returnPos = { x: CAMPUS_CORE.spawn.x, y: CAMPUS_CORE.spawn.y };
  private facing: Facing = 'down';
  private dialogNpc: NpcRuntimeState | null = null;
  private abort: AbortController | null = null;
  private overlay!: Phaser.GameObjects.Rectangle;
  private zoneName = '临江校区';
  private autosaveTimer = 0;
  private saved: SaveData | null = null;
  private waterTiles: Phaser.GameObjects.TileSprite[] = [];
  private lampGlows: Phaser.GameObjects.Arc[] = [];
  private minimap!: Phaser.GameObjects.Graphics;

  constructor() {
    super('World');
  }

  private get ui(): UiBundle {
    return this.game.registry.get('ui') as UiBundle;
  }

  create(data: { newGame?: boolean }): void {
    this.saved = data?.newGame ? null : loadGame();
    this.clock.value = this.saved?.clockMinutes ?? 8 * 60;
    this.clock.speed = loadSettings().clockSpeed;

    this.ensureNpcs();

    const start = this.saved?.player ?? { x: CAMPUS_CORE.spawn.x, y: CAMPUS_CORE.spawn.y };
    this.player = this.physics.add.sprite(start.x, start.y, 'player_down_0');
    this.player.setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // 精灵为 32×48，碰撞盒贴合脚部；shortcut: 固定像素尺寸，若日后改精灵大小需同步这里
    body.setSize(16, 10).setOffset(8, 36);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ESC') as Keys;
    this.physics.world.setBounds(0, 0, CAMPUS_CORE.width, CAMPUS_CORE.height);
    this.physics.add.collider(this.player, this.colliders);

    this.overlay = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xffffff, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9000)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    // 小地图：固定右上角，画在昼夜叠加层之上，不受染色影响
    this.minimap = this.add.graphics().setScrollFactor(0).setDepth(9100);

    if (this.saved && this.saved.player.map !== 'campus_core' && INTERIORS[this.saved.player.map]) {
      this.loadOutdoor({ x: CAMPUS_CORE.spawn.x, y: CAMPUS_CORE.spawn.y });
      this.loadInterior(this.saved.player.map, { x: this.saved.player.x, y: this.saved.player.y });
    } else {
      this.loadOutdoor({ x: start.x, y: start.y });
    }

    if (!this.scene.isActive('UI')) this.scene.launch('UI');

    this.game.events.on('ui:interact', this.tryInteract, this);
    this.game.events.on('ui:talk-at', this.tryTalkAt, this);
    this.game.events.on('ui:save', this.manualSave, this);
    this.game.events.on('ui:settings-saved', this.onSettingsSaved, this);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('ui:interact', this.tryInteract, this);
      this.game.events.off('ui:talk-at', this.tryTalkAt, this);
      this.game.events.off('ui:save', this.manualSave, this);
      this.game.events.off('ui:settings-saved', this.onSettingsSaved, this);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    });

    if (!prefersReducedMotion()) this.cameras.main.fadeIn(260, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    this.clock.update(delta);
    this.ui.hud.setClock(this.clock.hhmm);
    this.triggerCooldown = Math.max(0, this.triggerCooldown - delta);

    const dialogOpen = this.ui.dialog.isOpen;
    const axis = this.registry.get('axis') as { x: number; y: number } | undefined;
    if (dialogOpen) this.player.setVelocity(0, 0);

    if (!dialogOpen) {
      this.handleMovement(axis ?? { x: 0, y: 0 });
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.tryInteract();
    }

    this.updateDoors();
    this.updateNpcs(delta);
    this.updateZone();
    this.updateOverlay();
    this.updateMinimap();
    this.updatePrompt();

    for (const w of this.waterTiles) {
      w.tilePositionX += delta * 0.006;
      w.tilePositionY += delta * 0.002;
    }

    this.autosaveTimer += delta;
    if (this.autosaveTimer > 30000) {
      this.autosaveTimer = 0;
      this.persist();
    }
  }

  private handleMovement(axis: { x: number; y: number }): void {
    const k = this.keys;
    let x = (k.A.isDown || k.LEFT.isDown ? -1 : 0) + (k.D.isDown || k.RIGHT.isDown ? 1 : 0) + axis.x;
    let y = (k.W.isDown || k.UP.isDown ? -1 : 0) + (k.S.isDown || k.DOWN.isDown ? 1 : 0) + axis.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.player.setVelocity(x * PLAYER_SPEED, y * PLAYER_SPEED);
    const moving = x !== 0 || y !== 0;
    if (moving) {
      this.facing = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down';
    }
    const dir = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    if (moving) this.player.anims.play(`player-walk-${dir}`, true);
    else this.player.anims.stop();
    this.applyFacing(this.player, 'player', this.facing);
    this.player.setDepth(this.player.y);
  }

  private applyFacing(sprite: Phaser.GameObjects.Sprite, prefix: string, facing: Facing): void {
    sprite.setFlipX(facing === 'left');
    if (sprite.anims.isPlaying) return;
    const suffix = facing === 'left' || facing === 'right' ? 'side' : facing;
    const key = `${prefix}_${suffix}_0`;
    if (sprite.texture.key !== key) sprite.setTexture(key);
  }

  // ---------- 地图加载 ----------

  private clearMap(): void {
    for (const obj of this.mapLayer) obj.destroy();
    this.mapLayer = [];
    this.colliders.length = 0;
  }

  private addBlocker(rect: Rect): void {
    const z = this.add.zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h);
    this.physics.add.existing(z, true);
    this.colliders.push(z);
  }

  private splitWater(rect: Rect): Rect[] {
    const overlapsX = rect.x < BRIDGE.x + BRIDGE.w && rect.x + rect.w > BRIDGE.x;
    const coversY = rect.y <= BRIDGE.y + BRIDGE.h && rect.y + rect.h >= BRIDGE.y;
    if (!overlapsX || !coversY) return [rect];
    const leftW = BRIDGE.x - rect.x;
    const rightX = BRIDGE.x + BRIDGE.w;
    const rightW = rect.x + rect.w - rightX;
    const out: Rect[] = [];
    if (leftW > 0) out.push({ x: rect.x, y: rect.y, w: leftW, h: rect.h });
    if (rightW > 0) out.push({ x: rightX, y: rect.y, w: rightW, h: rect.h });
    return out;
  }

  private loadOutdoor(spawn: { x: number; y: number }): void {
    this.clearMap();
    this.interior = null;
    this.mapId = 'campus_core';
    this.doors = [];
    const W = CAMPUS_CORE.width;
    const H = CAMPUS_CORE.height;
    this.physics.world.setBounds(0, 0, W, H);

    this.waterTiles = [];
    this.lampGlows = [];
    this.paintGround(W, H);

    const shore = this.add.graphics().setDepth(-899);
    for (const water of CAMPUS_CORE.waters) {
      for (const part of this.splitWater(water)) {
        const ts = this.add
          .tileSprite(part.x + part.w / 2, part.y + part.h / 2, part.w, part.h, 't_water0')
          .setDepth(-900);
        this.mapLayer.push(ts);
        this.waterTiles.push(ts);
        shore.fillStyle(0xd8c3a5, 0.95);
        shore.fillRect(part.x - 4, part.y - 4, part.w + 8, 4);
        shore.fillRect(part.x - 4, part.y + part.h, part.w + 8, 4);
        shore.fillRect(part.x - 4, part.y, 4, part.h);
        shore.fillRect(part.x + part.w, part.y, 4, part.h);
      }
    }
    this.mapLayer.push(shore);
    this.drawFacilities();

    for (const b of CAMPUS_CORE.buildings) {
      const photoKey = this.textures.exists(`photo_${b.id}`) ? `photo_${b.id}` : undefined;
      const key = ensureBuildingBox(this, b, photoKey);
      const img = this.add
        .image(b.rect.x, b.rect.y, key)
        .setOrigin(0)
        .setDepth(b.rect.y + b.rect.h);
      const isGate = b.id === 'gate_south';
      const label = this.add
        .text(
          b.rect.x + b.rect.w / 2,
          isGate ? b.rect.y + 38 : b.rect.y + b.rect.h - 18,
          b.name,
          {
            fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
            fontSize: isGate ? '17px' : '15px',
            color: isGate ? '#f2e8d5' : '#2b2622',
            backgroundColor: isGate ? '#7a2e2a' : '#f2e8d5',
            padding: { x: 6, y: 2 },
          },
        )
        .setOrigin(0.5, isGate ? 0.5 : 1)
        .setDepth(b.rect.y + b.rect.h + 2);
      this.mapLayer.push(img, label);
    }

    this.drawProps();

    for (const edge of [
      { x: -40, y: -40, w: W + 80, h: 80 },
      { x: -40, y: H, w: W + 80, h: 80 },
      { x: -40, y: 0, w: 80, h: H },
      { x: W, y: 0, w: 80, h: H },
    ]) {
      this.addBlocker(edge);
    }
    for (const b of CAMPUS_CORE.blockers) this.addBlocker(b);
    for (const b of CAMPUS_CORE.buildings) this.addBlocker(b.rect);
    for (const water of CAMPUS_CORE.waters) {
      for (const part of this.splitWater(water)) this.addBlocker(part);
    }

    for (const b of CAMPUS_CORE.buildings) {
      if (!b.door) continue;
      this.doors.push({ rect: b.door, target: b.door.target, spawn: b.door.spawn });
    }

    this.player.setPosition(spawn.x, spawn.y);
    this.player.setDepth(spawn.y);
    this.facing = 'down';
    this.applyFacing(this.player, 'player', 'down');

    for (const npc of this.npcs) {
      const sprite = this.npcSprites.get(npc.def.id);
      if (!sprite) continue;
      sprite.setVisible(true).setPosition(npc.pos.x, npc.pos.y).setVelocity(0, 0);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.enable = true;
      this.applyFacing(sprite, `npc_${npc.def.id}`, npc.facing);
    }

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.setZoom(CAMERA_ZOOM);
    cam.startFollow(this.player, true, 0.12, 0.12);
  }

  private drawFacilities(): void {
    const g = this.add.graphics().setDepth(-880);

    // 第一田径运动场：跑道、内场、看台
    g.fillStyle(0x4f8a3f);
    g.fillEllipse(450, 525, 460, 300);
    g.lineStyle(3, 0xf2e8d5, 0.85);
    g.strokeEllipse(450, 525, 640, 470);
    g.strokeEllipse(450, 525, 600, 430);
    g.strokeEllipse(450, 525, 560, 390);
    g.strokeEllipse(450, 525, 520, 350);
    g.strokeEllipse(450, 525, 480, 310);
    g.strokeEllipse(450, 525, 460, 290);
    g.fillStyle(0x6a625a);
    g.fillRect(150, 216, 600, 24);
    g.fillRect(150, 810, 600, 24);
    g.fillStyle(0x8a827a);
    for (let i = 0; i < 24; i += 1) {
      g.fillRect(156 + i * 24, 220, 18, 16);
      g.fillRect(156 + i * 24, 814, 18, 16);
    }

    // 第一球类运动场：按公开资料为 12 片篮球场 + 8 片羽毛球场 + 5 片排球场，
    // 这里用 6 片篮球场 + 羽毛球场 + 排球场做像素化示意。
    g.lineStyle(3, 0xf2e8d5, 0.8);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const x = 120 + col * 210;
        const y = 1620 + row * 140;
        g.strokeRect(x, y, 190, 116);
        g.lineBetween(x + 95, y, x + 95, y + 116);
        g.strokeCircle(x + 95, y + 58, 18);
        g.fillStyle(0x8a5a3a);
        g.fillRect(x + 88, y + 4, 14, 3);
        g.fillRect(x + 88, y + 109, 14, 3);
        g.lineStyle(3, 0xf2e8d5, 0.8);
      }
    }
    // 羽毛球场（西侧，4 片示意）
    g.lineStyle(2, 0xf2e8d5, 0.7);
    for (let i = 0; i < 4; i += 1) {
      const x = 120 + (i % 2) * 140;
      const y = 2040 + Math.floor(i / 2) * 110;
      g.strokeRect(x, y, 130, 100);
      g.lineBetween(x, y + 50, x + 130, y + 50);
    }
    // 排球场（南侧，2 片示意）
    g.lineStyle(2, 0xf2e8d5, 0.7);
    for (let i = 0; i < 2; i += 1) {
      const x = 120 + i * 180;
      g.strokeRect(x, 2270, 170, 110);
      g.lineBetween(x + 85, 2270, x + 85, 2380);
    }

    // 雅园五人制足球场
    g.lineStyle(3, 0xf2e8d5, 0.8);
    g.strokeRect(670, 2170, 340, 260);
    g.lineBetween(840, 2170, 840, 2430);
    g.strokeCircle(840, 2300, 34);
    g.strokeRect(670, 2250, 26, 100);
    g.strokeRect(984, 2250, 26, 100);

    // 可园网球场
    g.strokeRect(2340, 2280, 180, 220);
    g.strokeRect(2550, 2280, 180, 220);
    g.lineBetween(2340, 2390, 2520, 2390);
    g.lineBetween(2550, 2390, 2730, 2390);

    // 瑞园篮球场
    for (let i = 0; i < 3; i += 1) {
      g.strokeRect(2430, 1080 + i * 90, 340, 76);
      g.lineBetween(2600, 1080 + i * 90, 2600, 1156 + i * 90);
      g.strokeCircle(2600, 1118 + i * 90, 12);
    }

    // 中轴石桥栏杆
    g.fillStyle(0xd8cbb4);
    g.fillRect(1488, 1760, 6, 260);
    g.fillRect(1700, 1760, 6, 260);
    g.fillStyle(0xb8ab95);
    for (let y = 1766; y < 2020; y += 24) {
      g.fillRect(1484, y, 14, 6);
      g.fillRect(1696, y, 14, 6);
    }
    this.mapLayer.push(g);
  }

  private paintGround(W: number, H: number): void {
    const key = 'ground_campus';
    if (!this.textures.exists(key)) {
      const canvasTex = this.textures.createCanvas(key, W, H);
      if (!canvasTex) return;
      const ctx = canvasTex.context;
      const cols = Math.ceil(W / 32);
      const rows = Math.ceil(H / 32);
      const drawTile = (imgKey: string, x: number, y: number): void => {
        const src = this.textures.get(imgKey).getSourceImage();
        ctx.drawImage(src as CanvasImageSource, x * 32, y * 32, 32, 32);
      };
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          drawTile(`t_grass${(x * 7 + y * 13) % 4}`, x, y);
        }
      }
      const rand = (seed: number): (() => number) => {
        let s = seed >>> 0;
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 4294967296;
        };
      };
      for (const p of CAMPUS_CORE.patches) {
        const terrain: Terrain = p.terrain;
        // 广场不铺 32px 地砖：整片用 canvas 直接画 64px 大石板，
        // 免得平铺网格一眼看出来。其余地形仍用 tile 变体。
        if (terrain === 'plaza') {
          const r = rand(p.rect.x * 7 + p.rect.y * 13 + p.rect.w);
          ctx.fillStyle = '#d3c9b5';
          ctx.fillRect(p.rect.x, p.rect.y, p.rect.w, p.rect.h);
          const slab = 64;
          for (let y = p.rect.y; y < p.rect.y + p.rect.h; y += slab) {
            for (let x = p.rect.x; x < p.rect.x + p.rect.w; x += slab) {
              const t = 0.94 + r() * 0.12;
              const v = Math.round(0xd3 * t);
              ctx.fillStyle = `rgb(${v},${Math.round(v * 0.949)},${Math.round(v * 0.855)})`;
              ctx.fillRect(x + 1, y + 1, slab - 2, slab - 2);
              // 板面污渍
              if (r() > 0.55) {
                ctx.fillStyle = 'rgba(190,182,166,0.28)';
                ctx.beginPath();
                ctx.arc(x + 8 + r() * (slab - 16), y + 8 + r() * (slab - 16), 4 + r() * 9, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          // 石板缝
          ctx.fillStyle = 'rgba(196,186,166,0.75)';
          for (let y = p.rect.y; y < p.rect.y + p.rect.h; y += slab) ctx.fillRect(p.rect.x, y, p.rect.w, 2);
          for (let x = p.rect.x; x < p.rect.x + p.rect.w; x += slab) ctx.fillRect(x, p.rect.y, 2, p.rect.h);
          continue;
        }
        const count = terrain === 'lawn' ? 1 : terrain === 'track' || terrain === 'court' ? 3 : 4;
        const x0 = Math.floor(p.rect.x / 32);
        const x1 = Math.ceil((p.rect.x + p.rect.w) / 32);
        const y0 = Math.floor(p.rect.y / 32);
        const y1 = Math.ceil((p.rect.y + p.rect.h) / 32);
        for (let y = y0; y < y1; y += 1) {
          for (let x = x0; x < x1; x += 1) {
            const v = (x * 5 + y * 11) % count;
            drawTile(terrain === 'lawn' ? 't_lawn0' : `t_${terrain}${v}`, x, y);
          }
        }
      }
      // 地形交界处原来描一圈 6px 深绿边，缩到 0.6 倍看会变成明显的“围栏线”，
      // 反而比硬边更扎眼，所以不再描边，交给贴图自身的斑驳过渡。
      canvasTex.refresh();
    }
    const img = this.add.image(0, 0, key).setOrigin(0).setDepth(-1000);
    this.mapLayer.push(img);
  }

  private drawProps(): void {
    const blockers = new Set(['ginkgo', 'pine', 'tree', 'pavilion']);
    for (const p of CAMPUS_CORE.props) {
      const img = this.add.image(p.x, p.y, `p_${p.kind}`).setOrigin(0.5, 1).setDepth(p.y);
      if (p.flip) img.setFlipX(true);
      if (p.scale) img.setScale(p.scale);
      this.mapLayer.push(img);

      if (p.kind === 'lamp') {
        const glow = this.add
          .circle(p.x, p.y - 46, 28, 0xffd27a, 0)
          .setDepth(p.y - 1)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.mapLayer.push(glow);
        this.lampGlows.push(glow);
      }

      if (blockers.has(p.kind)) {
        const w = p.kind === 'pavilion' ? 52 : 22;
        const h = p.kind === 'pavilion' ? 18 : 13;
        this.addBlocker({ x: p.x - w / 2, y: p.y - h, w, h });
      }

      if (p.label) {
        const big = (p.scale ?? 1) > 1.5;
        const isStone = p.kind === 'stone';
        const t = this.add
          .text(p.x, p.y - (isStone ? 34 : 42), p.label, {
            fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
            fontSize: isStone ? (big ? '13px' : '11px') : '10px',
            color: '#f2e8d5',
            backgroundColor: isStone ? '#7a2e2a' : undefined,
            stroke: '#2b2622',
            strokeThickness: isStone ? 0 : 3,
            align: 'center',
            padding: { x: isStone ? 5 : 2, y: 1 },
          })
          .setOrigin(0.5, 1)
          .setDepth(p.y + 1);
        this.mapLayer.push(t);
      }
    }
  }

  private drawTrackAndCourts(): void {
    const g = this.add.graphics().setDepth(-930);
    g.lineStyle(6, 0xf2e8d5, 0.5);
    g.strokeEllipse(450, 525, 620, 460);
    g.strokeEllipse(450, 525, 470, 320);
    g.lineStyle(2, 0xf2e8d5, 0.35);
    g.lineBetween(450, 295, 450, 755);
    g.lineBetween(140, 525, 760, 525);

    g.lineStyle(3, 0xf2e8d5, 0.45);
    for (let i = 0; i < 3; i += 1) {
      const x = 130 + i * 140;
      g.strokeRect(x, 1700, 120, 200);
    }
    g.strokeRect(150, 1650, 380, 60);
    g.strokeRect(150, 1960, 380, 60);
    this.mapLayer.push(g);
  }

  private drawBuilding(b: BuildingDef): void {
    const { x, y, w, h } = b.rect;
    const c = styleColors(b.style);
    const g = this.add.graphics().setDepth(y + h);
    g.fillStyle(0x000000, 0.16);
    g.fillRect(x + 10, y + h - 8, w, 16);

    if (b.style === 'chinese') {
      g.fillStyle(c.roof);
      g.fillRect(x - 12, y - 16, w + 24, 44);
      g.fillStyle(0x4a3f38);
      g.fillRect(x - 16, y - 22, w + 32, 8);
      g.fillStyle(c.wall);
      g.fillRect(x, y + 22, w, h - 22);
    } else if (b.style === 'modern') {
      g.fillStyle(c.roof);
      g.fillRect(x, y, w, 20);
      g.fillStyle(c.wall);
      g.fillRect(x, y + 20, w, h - 20);
    } else {
      g.fillStyle(c.roof);
      g.fillRect(x - 6, y - 6, w + 12, 26);
      g.fillStyle(c.wall);
      g.fillRect(x, y + 16, w, h - 16);
    }

    g.fillStyle(c.trim);
    g.fillRect(x, y + h - 12, w, 12);

    g.fillStyle(b.style === 'modern' ? 0x5a7d8c : 0x5a7d8c, 0.85);
    const startY = b.style === 'chinese' ? y + 50 : y + 46;
    const cols = Math.max(2, Math.floor((w - 40) / 90));
    const winW = 46;
    const gap = (w - cols * winW) / (cols + 1);
    for (let row = 0; row < Math.max(1, Math.floor((h - 90) / 70)); row += 1) {
      for (let col = 0; col < cols; col += 1) {
        g.fillRect(x + gap + col * (winW + gap), startY + row * 70, winW, 32);
      }
    }

    if (b.door) {
      g.fillStyle(0x3a2a20);
      g.fillRect(b.door.x, Math.max(y + 30, b.door.y), b.door.w, Math.min(b.door.h, 60));
    }

    const label = this.add
      .text(x + w / 2, y + h - 24, b.name, {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: '16px',
        color: '#2b2622',
        backgroundColor: '#f2e8d5',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(y + h + 1);
    this.mapLayer.push(g, label);
  }

  // ---------- 室内 ----------

  private loadInterior(id: string, spawnOverride?: { x: number; y: number }): void {
    const def = INTERIORS[id];
    if (!def) return;
    this.clearMap();
    this.interior = def;
    this.mapId = id;
    const W = def.width;
    const H = def.height;
    this.physics.world.setBounds(0, 0, W, H);

    const floorKey = id === 'interior_library' || id === 'interior_linjiang' ? 't_wood' : 't_plaza0';
    const floor = this.add.tileSprite(W / 2, H / 2, W, H, floorKey).setDepth(-1000);
    this.mapLayer.push(floor);

    const wall = 24;
    const g = this.add.graphics().setDepth(5000);
    g.fillStyle(def.wallColor);
    g.fillRect(0, 0, W, wall);
    g.fillRect(0, 0, wall, H);
    g.fillRect(W - wall, 0, wall, H);
    g.fillRect(0, H - wall, W, wall);
    g.fillStyle(def.floorColor);
    g.fillRect(def.exit.x, H - wall, def.exit.w, wall);
    this.mapLayer.push(g);

    this.addBlocker({ x: 0, y: 0, w: W, h: wall });
    this.addBlocker({ x: 0, y: 0, w: wall, h: H });
    this.addBlocker({ x: W - wall, y: 0, w: wall, h: H });
    this.addBlocker({ x: 0, y: H - wall, w: def.exit.x, h: wall });
    this.addBlocker({
      x: def.exit.x + def.exit.w,
      y: H - wall,
      w: W - def.exit.x - def.exit.w,
      h: wall,
    });

    for (const f of def.furniture) {
      const key = ensureFurnitureTexture(this, f);
      const img = this.add
        .image(f.rect.x + f.rect.w / 2, f.rect.y + f.rect.h / 2, key)
        .setDepth(f.rect.y + f.rect.h);
      this.mapLayer.push(img);
      this.addBlocker(f.rect);
      if (f.label) {
        const t = this.add
          .text(f.rect.x + f.rect.w / 2, f.rect.y + f.rect.h / 2, f.label, {
            fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: '#f7efe0',
            stroke: '#2b2622',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(f.rect.y + f.rect.h + 1);
        this.mapLayer.push(t);
      }
    }

    const exitMark = this.add
      .rectangle(def.exit.x + def.exit.w / 2, def.exit.y + 20, def.exit.w, 24, 0x7a2e2a)
      .setDepth(12);
    const exitText = this.add
      .text(def.exit.x + def.exit.w / 2, def.exit.y + 20, '出口', {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#f2e8d5',
      })
      .setOrigin(0.5)
      .setDepth(13);
    this.mapLayer.push(exitMark, exitText);

    const p = spawnOverride ?? def.spawn;
    this.player.setPosition(p.x, p.y);
    this.player.setDepth(p.y);
    this.player.setVelocity(0, 0);
    this.applyFacing(this.player, 'player', 'down');

    for (const npc of this.npcs) {
      const sprite = this.npcSprites.get(npc.def.id);
      if (!sprite) continue;
      sprite.setVelocity(0, 0).setVisible(false);
      (sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    this.zoneName = def.name;
    this.ui.hud.setZone(def.name);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.setZoom(1.6);
    cam.startFollow(this.player, true, 0.15, 0.15);
  }

  // ---------- NPC ----------

  private ensureNpcs(): void {
    if (this.npcs.length > 0) return;
    for (const def of NPCS) {
      const resolved = resolveNpcState(def, this.clock.value);
      const anchor = this.anchorMap.get(resolved.anchorId) ?? CAMPUS_CORE.spawn;
      const sprite = this.physics.add.sprite(anchor.x, anchor.y, `npc_${def.id}_down_0`);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(14, 10).setOffset(9, 36);
      sprite.setDepth(anchor.y);
      this.physics.add.collider(sprite, this.colliders);
      this.npcSprites.set(def.id, sprite);
      this.npcs.push({
        def,
        pos: { x: anchor.x, y: anchor.y },
        facing: 'down',
        anchorId: resolved.anchorId,
        zoneId: resolved.zoneId,
        activity: resolved.activity,
        mode: 'wander',
        cooldownUntil: 0,
        lastChatAt: 0,
      });
    }
  }

  private updateNpcs(delta: number): void {
    if (this.interior) return;
    this.npcScheduleTimer += delta;
    const now = this.time.now;

    if (this.npcScheduleTimer >= 1000) {
      this.npcScheduleTimer = 0;
      for (const state of this.npcs) {
        const resolved = resolveNpcState(state.def, this.clock.value);
        state.activity = resolved.activity;
        if (resolved.anchorId === state.anchorId) continue;
        state.anchorId = resolved.anchorId;
        state.zoneId = resolved.zoneId;
        const sprite = this.npcSprites.get(state.def.id);
        const anchor = this.anchorMap.get(resolved.anchorId);
        if (!sprite || !anchor) continue;
        const visible = this.cameras.main.worldView.contains(sprite.x, sprite.y);
        if (!visible) {
          sprite.setPosition(anchor.x, anchor.y);
          sprite.setVelocity(0, 0);
          sprite.setData('wanderTarget', null);
          sprite.setData('anchorTarget', null);
          state.mode = 'wander';
        } else {
          sprite.setData('anchorTarget', { x: anchor.x, y: anchor.y });
          state.mode = 'walk_to_anchor';
        }
      }
    }

    for (const state of this.npcs) {
      const sprite = this.npcSprites.get(state.def.id);
      if (!sprite || !sprite.visible) continue;
      const body = sprite.body as Phaser.Physics.Arcade.Body;

      if (state.mode === 'talking') {
        sprite.setVelocity(0, 0);
        const dx = this.player.x - sprite.x;
        const dy = this.player.y - sprite.y;
        state.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      } else if (state.mode === 'walk_to_anchor') {
        const target = sprite.getData('anchorTarget') as { x: number; y: number } | null;
        if (!target) {
          state.mode = 'wander';
        } else {
          const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, target.x, target.y);
          if (dist < 26) {
            sprite.setVelocity(0, 0);
            state.mode = 'wander';
            sprite.setData('anchorTarget', null);
            sprite.setData('wanderTarget', null);
          } else {
            this.physics.moveTo(sprite, target.x, target.y, 48);
            this.setNpcFacing(state, body);
          }
        }
      } else {
        let target = sprite.getData('wanderTarget') as { x: number; y: number; until: number } | null;
        if (!target || now > target.until) {
          const base = this.anchorMap.get(state.anchorId) ?? { x: sprite.x, y: sprite.y };
          const angle = Math.random() * Math.PI * 2;
          const radius = 20 + Math.random() * state.def.wander.radiusPx;
          target = {
            x: Phaser.Math.Clamp(base.x + Math.cos(angle) * radius, 60, CAMPUS_CORE.width - 60),
            y: Phaser.Math.Clamp(base.y + Math.sin(angle) * radius, 60, CAMPUS_CORE.height - 60),
            until: now + 2500 + Math.random() * 2500,
          };
          sprite.setData('wanderTarget', target);
        }
        const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, target.x, target.y);
        if (dist < 12) {
          sprite.setVelocity(0, 0);
          sprite.setData('wanderTarget', null);
        } else {
          this.physics.moveTo(sprite, target.x, target.y, state.def.wander.speed);
          this.setNpcFacing(state, body);
        }
      }

      const moving = Math.hypot(body.velocity.x, body.velocity.y) > 4;
      const dir = state.facing === 'left' || state.facing === 'right' ? 'side' : state.facing;
      if (moving) sprite.anims.play(`npc_${state.def.id}-walk-${dir}`, true);
      else sprite.anims.stop();
      this.applyFacing(sprite, `npc_${state.def.id}`, state.facing);
      sprite.setDepth(sprite.y);
      state.pos = { x: sprite.x, y: sprite.y };
    }
  }

  private setNpcFacing(state: NpcRuntimeState, body: Phaser.Physics.Arcade.Body): void {
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    if (Math.abs(vx) < 2 && Math.abs(vy) < 2) return;
    state.facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
  }

  // ---------- 门与场景切换 ----------

  private feet(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y + 13 };
  }

  private updateDoors(): void {
    if (this.triggerCooldown > 0 || this.ui.dialog.isOpen) return;
    const feet = this.feet();
    if (this.interior) {
      const e = this.interior.exit;
      if (feet.x >= e.x && feet.x <= e.x + e.w && feet.y >= e.y && feet.y <= e.y + e.h) {
        this.exitInterior();
      }
      return;
    }
    for (const door of this.doors) {
      const r = door.rect;
      if (feet.x >= r.x && feet.x <= r.x + r.w && feet.y >= r.y && feet.y <= r.y + r.h) {
        this.enterInterior(door);
        break;
      }
    }
  }

  /** 场景切换：减少动效时直接切换，否则淡出淡入。 */
  private transition(swap: () => void): void {
    const cam = this.cameras.main;
    if (prefersReducedMotion()) {
      swap();
      this.persist();
      return;
    }
    cam.fadeOut(140, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      swap();
      cam.fadeIn(170, 0, 0, 0);
      this.persist();
    });
  }

  private enterInterior(door: DoorRuntime): void {
    this.returnPos = { x: this.player.x, y: this.player.y + 90 };
    this.triggerCooldown = 1400;
    this.transition(() => this.loadInterior(door.target));
  }

  private exitInterior(): void {
    const back = this.returnPos;
    this.triggerCooldown = 1400;
    this.transition(() => this.loadOutdoor(back));
  }

  // ---------- 交互与对话 ----------

  private tryInteract(): void {
    if (this.interior || this.ui.dialog.isOpen) return;
    const feet = this.feet();
    const hit = pickInteractable(
      { x: feet.x, y: feet.y, facing: this.facing },
      this.npcs,
      INTERACT_DIST,
    );
    if (!hit) return;
    if (hit.cooldownUntil > performance.now()) {
      this.ui.hud.toast('对方正在忙，稍后再聊');
      return;
    }
    this.startDialog(hit);
  }

  /** 触屏点按 NPC：在世界坐标附近找 NPC，若在可交互距离内则直接对话。 */
  private tryTalkAt(screen: { x: number; y: number }): void {
    if (this.interior || this.ui.dialog.isOpen) return;
    const world = this.cameras.main.getWorldPoint(screen.x, screen.y);
    let best: NpcRuntimeState | null = null;
    let bestDist = 80;
    for (const npc of this.npcs) {
      if (npc.mode === 'talking') continue;
      const d = Phaser.Math.Distance.Between(world.x, world.y, npc.pos.x, npc.pos.y);
      if (d < bestDist) {
        bestDist = d;
        best = npc;
      }
    }
    if (!best) return;
    // 仍需玩家靠近，避免隔空点按
    const foot = this.feet();
    if (Phaser.Math.Distance.Between(foot.x, foot.y, best.pos.x, best.pos.y) > INTERACT_DIST) {
      this.ui.hud.toast('走近一点再聊');
      return;
    }
    if (best.cooldownUntil > performance.now()) {
      this.ui.hud.toast('对方正在忙，稍后再聊');
      return;
    }
    this.startDialog(best);
  }

  private startDialog(npc: NpcRuntimeState): void {
    this.dialogNpc = npc;
    npc.mode = 'talking';
    npc.lastChatAt = Date.now();
    this.player.setVelocity(0, 0);

    const settings = loadSettings();
    const greeting = settings.apiKey.trim()
      ? pick(npc.def.greeting)
      : `${pick(npc.def.greeting)}（未配置 AI，先聊预设台词）`;

    this.ui.dialog.open(npc.def.name, `${npc.def.role} · ${this.zoneName}`, greeting, {
      onSend: (text) => void this.sendToNpc(npc, text),
      onStop: () => this.abort?.abort(),
      onClose: () => {
        npc.mode = 'wander';
        npc.cooldownUntil = performance.now() + npc.def.limits.cooldownSec * 1000;
        this.dialogNpc = null;
        this.abort = null;
        this.persist();
      },
      onSettings: () => this.ui.settings.open(),
    });
  }

  private async sendToNpc(npc: NpcRuntimeState, text: string): Promise<void> {
    const settings = loadSettings();
    if (!settings.apiKey.trim()) {
      const bubble = this.ui.dialog.startAssistant();
      bubble.finish();
      this.ui.dialog.addMessage('npc', pick(npc.def.fallbacks));
      this.ui.dialog.addMessage('sys', '（未配置 AI，以上为预设台词；可在设置中填写 API Key）');
      return;
    }

    const ctx = {
      npc: npc.def,
      state: npc,
      now: { minutes: this.clock.value, hhmm: this.clock.hhmm, phase: this.clock.phase },
      zoneName: this.zoneName,
      playerName: settings.playerName,
      memory: getMemory(npc.def.id),
    };
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: buildSystemPrompt(ctx) },
      ...ctx.memory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: buildUserMessage(text) },
    ];

    const bubble = this.ui.dialog.startAssistant();
    this.abort?.abort();
    const controller = new AbortController();
    this.abort = controller;
    let answer = '';

    await streamChat(
      settings,
      messages,
      {
        onDelta: (chunk) => {
          answer += chunk;
          bubble.append(chunk);
        },
        onDone: () => {
          bubble.finish();
          pushTurn(npc.def.id, { role: 'user', content: text, at: Date.now() });
          if (answer.trim()) {
            pushTurn(npc.def.id, { role: 'assistant', content: answer, at: Date.now() });
          }
        },
        onError: (e) => {
          if (e.kind === 'aborted') {
            bubble.finish();
            if (answer.trim()) {
              pushTurn(npc.def.id, { role: 'user', content: text, at: Date.now() });
              pushTurn(npc.def.id, { role: 'assistant', content: answer, at: Date.now() });
            }
            return;
          }
          bubble.fail(`（${e.message}）`);
          this.ui.dialog.addMessage('npc', pick(npc.def.fallbacks));
        },
      },
      controller.signal,
    );
  }

  // ---------- HUD / 昼夜 / 存档 ----------

  private updateZone(): void {
    let name = this.zoneName;
    if (this.interior) {
      name = this.interior.name;
    } else {
      const feet = this.feet();
      name = '临江校区';
      for (const z of CAMPUS_CORE.zones) {
        const r = z.rect;
        if (feet.x >= r.x && feet.x <= r.x + r.w && feet.y >= r.y && feet.y <= r.y + r.h) {
          name = z.name;
          break;
        }
      }
    }
    if (name !== this.zoneName) {
      this.zoneName = name;
      this.ui.hud.setZone(name);
    }
  }

  private updateOverlay(): void {
    const phase = this.clock.phase;
    let color = 0xffffff;
    let alpha = 0;
    let glow = 0;
    if (phase === 'dawn') {
      color = 0xffd0a8;
      alpha = 0.2;
    } else if (phase === 'dusk') {
      color = 0xff9a68;
      alpha = 0.3;
      glow = 0.14;
    } else if (phase === 'night') {
      color = 0x4a5a8a;
      alpha = 0.45;
      glow = 0.42;
    }
    this.overlay.setFillStyle(color, alpha);
    for (const g of this.lampGlows) g.setAlpha(glow);
  }

  /** 右上角小地图：室外显示水体/建筑/NPC/玩家与当前视野；室内隐藏。 */
  private updateMinimap(): void {
    const g = this.minimap;
    g.clear();
    if (this.interior) return;
    // 相机 zoom 会一并放大 scrollFactor(0) 的对象，这里反向补偿，
    // 让小地图在任意 zoom 下都钉在屏幕右上角并保持 1:1 像素尺寸。
    const z = this.cameras.main.zoom;
    g.setScale(1 / z).setPosition((GAME_W / 2) * (1 - 1 / z), (GAME_H / 2) * (1 - 1 / z));
    const mw = 168;
    const mh = 140;
    // 放左上角：右上角被 DOM 的「设置/帮助/存档」按钮占着，会互相遮挡。
    const ox = 8;
    const oy = 8;
    const scale = Math.min((mw - 8) / CAMPUS_CORE.width, (mh - 8) / CAMPUS_CORE.height);
    const px = (x: number) => ox + 4 + x * scale;
    const py = (y: number) => oy + 4 + y * scale;

    g.fillStyle(0x181512, 0.82).fillRoundedRect(ox, oy, mw, mh, 6);
    g.lineStyle(1, 0xd8c3a5, 0.5).strokeRoundedRect(ox, oy, mw, mh, 6);
    // 水体
    g.fillStyle(0x3a6a8a, 0.9);
    for (const w of CAMPUS_CORE.waters) g.fillRect(px(w.x), py(w.y), w.w * scale, w.h * scale);
    // 建筑
    g.fillStyle(0xb8a480, 0.95);
    for (const b of CAMPUS_CORE.buildings) {
      g.fillRect(px(b.rect.x), py(b.rect.y), b.rect.w * scale, b.rect.h * scale);
    }
    // 相机视野框
    const view = this.cameras.main.worldView;
    g.lineStyle(1, 0xf2e8d5, 0.8).strokeRect(px(view.x), py(view.y), view.width * scale, view.height * scale);
    // NPC
    g.fillStyle(0x7ec8a0, 1);
    for (const npc of this.npcs) {
      if (npc.mode === 'talking') continue;
      g.fillCircle(px(npc.pos.x), py(npc.pos.y), 1.6);
    }
    // 玩家
    g.fillStyle(0xe04a3a, 1).fillCircle(px(this.player.x), py(this.player.y), 3);
  }

  private updatePrompt(): void {
    if (this.interior || this.ui.dialog.isOpen) {
      this.ui.hud.showPrompt(null);
      return;
    }
    const feet = this.feet();
    const hit = pickInteractable(
      { x: feet.x, y: feet.y, facing: this.facing },
      this.npcs,
      INTERACT_DIST,
    );
    this.ui.hud.showPrompt(hit ? `E 交谈 · ${hit.def.name}` : null);
  }

  private persist(): void {
    const data: SaveData = {
      version: 1,
      player: {
        map: this.mapId,
        x: this.player.x,
        y: this.player.y,
        facing: this.facing,
        name: loadSettings().playerName,
      },
      clockMinutes: this.clock.value,
      savedAt: Date.now(),
    };
    saveGame(data);
  }

  private manualSave(): void {
    this.persist();
    this.ui.hud.toast('已保存');
  }

  /** 设置面板保存后即时同步时钟倍率。 */
  private onSettingsSaved(s: { clockSpeed?: number }): void {
    if (s && typeof s.clockSpeed === 'number') this.clock.speed = s.clockSpeed;
  }

  /** 页面隐藏（切标签/锁屏）时中止正在进行的 LLM 流，避免后台跑请求。 */
  private onVisibilityChange = (): void => {
    if (document.hidden && this.abort) {
      this.abort.abort();
      this.abort = null;
    }
  };
}
