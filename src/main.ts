import Phaser from 'phaser';
import './style.css';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { Hud } from './ui/hud';
import { DialogPanel } from './ui/dialogPanel';
import { SettingsPanel } from './ui/settingsPanel';
import { HelpPanel } from './ui/helpPanel';
import { loadMemory } from './dialog/memory';

// 恢复上次的 NPC 对话记忆（localStorage，隐私模式下静默降级为空）
loadMemory();

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('#ui-root missing');

const settings = new SettingsPanel(uiRoot, (s) => {
  // 设置保存后立即同步时钟倍率到正在运行的场景
  game.events.emit('ui:settings-saved', s);
});
const help = new HelpPanel(uiRoot, () => settings.open());
const dialog = new DialogPanel(uiRoot);
const hud = new Hud(uiRoot, {
  onSettings: () => settings.open(),
  onHelp: () => help.open(),
  onSave: () => game.events.emit('ui:save'),
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#14110f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, WorldScene, UIScene],
});

game.registry.set('ui', { hud, dialog, settings, help });
(window as unknown as { __game: Phaser.Game }).__game = game;
