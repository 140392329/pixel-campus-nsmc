import Phaser from 'phaser';
import { NPCS } from '../data/npcs';
import {
  createCharacterAnims,
  generateCharacterTextures,
  generateGroundTextures,
  generatePropTextures,
} from '../art/textures';
import { PHOTO_FACADES } from '../art/photoManifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // 实景照片像素化后的立面，key 统一加 photo_ 前缀，供 pseudo3d 合成用。
    for (const [id, facade] of Object.entries(PHOTO_FACADES)) {
      this.load.image(`photo_${id}`, facade.url);
    }
  }

  create(): void {
    generateGroundTextures(this);
    generatePropTextures(this);

    generateCharacterTextures(this, 'player', {
      shirt: 0x8a3b34,
      hair: 0x2a201a,
      pants: 0x46506a,
      skin: 0xf0c8a0,
      shoes: 0x2a2320,
    });
    createCharacterAnims(this, 'player');

    for (const npc of NPCS) {
      const prefix = `npc_${npc.id}`;
      generateCharacterTextures(this, prefix, {
        shirt: npc.color,
        hair: 0x2e2119,
        pants: 0x46506a,
        skin: 0xf0c8a0,
        shoes: 0x2a2320,
      });
      createCharacterAnims(this, prefix);
    }

    this.scene.start('Menu');
  }
}
