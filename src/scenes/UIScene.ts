import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';

export class UIScene extends Phaser.Scene {
  private baseX = 110;
  private baseY = GAME_H - 110;
  private thumb!: Phaser.GameObjects.Arc;
  private base!: Phaser.GameObjects.Arc;
  private interactBtn!: Phaser.GameObjects.Container;
  private pointerId = -1;
  private showTouch = false;
  private tapStart: { id: number; x: number; y: number; at: number } | null = null;

  constructor() {
    super('UI');
  }

  create(): void {
    const touch = this.sys.game.device.input.touch;
    this.showTouch = touch;

    this.base = this.add
      .circle(this.baseX, this.baseY, 52, 0xd8c3a5, 0.14)
      .setStrokeStyle(3, 0xd8c3a5, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.thumb = this.add
      .circle(this.baseX, this.baseY, 22, 0xd8c3a5, 0.5)
      .setStrokeStyle(2, 0xf2e8d5, 0.7)
      .setScrollFactor(0)
      .setDepth(101);

    const btnBg = this.add.circle(0, 0, 36, 0x7a2e2a, 0.82).setStrokeStyle(3, 0xf2e8d5, 0.8);
    const btnText = this.add
      .text(0, 0, 'E', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#f2e8d5',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.interactBtn = this.add
      .container(GAME_W - 90, GAME_H - 90, [btnBg, btnText])
      .setScrollFactor(0)
      .setDepth(100)
      .setSize(80, 80)
      .setInteractive(new Phaser.Geom.Circle(0, 0, 40), Phaser.Geom.Circle.Contains);

    this.interactBtn.on('pointerdown', () => {
      this.tweens.add({ targets: this.interactBtn, scale: 0.9, duration: 60, yoyo: true });
      this.game.events.emit('ui:interact');
    });

    this.setTouchVisible(this.showTouch);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((p as unknown as { pointerType?: string }).pointerType === 'touch' && !this.showTouch) {
        this.showTouch = true;
        this.setTouchVisible(true);
      }
      // 记录短按起点，用于"点按 NPC 对话"（排除摇杆区与交互按钮）
      const onJoystick = p.x < GAME_W * 0.5 && p.y > GAME_H * 0.55;
      const onButton = p.x > GAME_W - 140 && p.y > GAME_H - 140;
      const onMinimap = p.x < 186 && p.y < 160;
      if (!onJoystick && !onButton && !onMinimap) {
        this.tapStart = { id: p.id, x: p.x, y: p.y, at: this.time.now };
      }
      if (!this.showTouch) return;
      if (onJoystick) {
        this.pointerId = p.id;
        this.moveThumb(p);
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.moveThumb(p);
    });

    const release = (p: Phaser.Input.Pointer) => {
      if (this.tapStart && this.tapStart.id === p.id) {
        const moved = Phaser.Math.Distance.Between(this.tapStart.x, this.tapStart.y, p.x, p.y);
        if (moved < 14 && this.time.now - this.tapStart.at < 400) {
          this.game.events.emit('ui:talk-at', { x: p.x, y: p.y });
        }
        this.tapStart = null;
      }
      if (p.id !== this.pointerId) return;
      this.pointerId = -1;
      this.thumb.setPosition(this.baseX, this.baseY);
      this.registry.set('axis', { x: 0, y: 0 });
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('pointercancel', release);

    this.registry.set('axis', { x: 0, y: 0 });
  }

  private setTouchVisible(visible: boolean): void {
    this.base.setVisible(visible);
    this.thumb.setVisible(visible);
    this.interactBtn.setVisible(visible || this.sys.game.device.input.touch);
  }

  private moveThumb(p: Phaser.Input.Pointer): void {
    let dx = p.x - this.baseX;
    let dy = p.y - this.baseY;
    const max = 46;
    const dist = Math.hypot(dx, dy);
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    this.thumb.setPosition(this.baseX + dx, this.baseY + dy);
    let nx = dx / max;
    let ny = dy / max;
    if (Math.hypot(nx, ny) < 0.15) {
      nx = 0;
      ny = 0;
    }
    this.registry.set('axis', { x: nx, y: ny });
  }
}
