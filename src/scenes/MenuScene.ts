import Phaser from 'phaser';
import { clearSave, loadGame } from '../systems/SaveManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1b1714');

    const bg = this.add.graphics();
    bg.fillStyle(0x2b241f);
    bg.fillRect(0, height * 0.58, width, height * 0.42);
    bg.fillStyle(0x6b8f4e);
    bg.fillRect(0, height * 0.58, width, 8);
    for (let i = 0; i < 18; i += 1) {
      const x = 40 + i * 52;
      bg.fillStyle(i % 2 === 0 ? 0x4a3b32 : 0x3b2f28);
      bg.fillRect(x, height * 0.62, 34, 70 + ((i * 37) % 60));
    }

    const title = this.add.text(width / 2, 120, '像素校园', {
      fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
      fontSize: '54px',
      color: '#f2e8d5',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    this.add
      .text(width / 2, 180, '川北医学院 · 临江校区', {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: '22px',
        color: '#d8c3a5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 222, '敬业 · 博爱 · 求是 · 创新', {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#9a8f80',
      })
      .setOrigin(0.5);

    const hasSave = loadGame() !== null;
    const entries: Array<[string, () => void, boolean]> = [
      ['新游戏', () => this.startGame(true), true],
      ['继续游戏', () => this.startGame(false), hasSave],
      ['设置', () => this.openSettings(), true],
    ];

    entries.forEach(([label, action, enabled], i) => {
      const btn = this.add
        .text(width / 2, 300 + i * 56, label, {
          fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
          fontSize: '24px',
          color: enabled ? '#f2e8d5' : '#6b6258',
          backgroundColor: '#2b241f',
          padding: { x: 32, y: 10 },
        })
        .setOrigin(0.5);
      if (!enabled) return;
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setColor('#e6c98a'));
      btn.on('pointerout', () => btn.setColor('#f2e8d5'));
      btn.on('pointerdown', action);
    });

    this.add
      .text(width / 2, height - 34, 'WASD / 方向键移动 · E 交谈 · 手机支持触屏', {
        fontFamily: 'system-ui, "Microsoft YaHei", sans-serif',
        fontSize: '13px',
        color: '#8b8175',
      })
      .setOrigin(0.5);
  }

  private startGame(newGame: boolean): void {
    if (newGame) clearSave();
    this.scene.start('World', { newGame });
  }

  private openSettings(): void {
    const ui = this.game.registry.get('ui');
    ui?.settings?.open();
  }
}
