import { describe, expect, it } from 'vitest';
import { migrate } from '../src/systems/SaveManager';

describe('SaveManager.migrate', () => {
  it('accepts a valid v1 save', () => {
    const out = migrate({
      version: 1,
      player: { map: 'campus_core', x: 10, y: 20, facing: 'left', name: '小林' },
      clockMinutes: 600,
      savedAt: 1,
    });
    expect(out?.player.facing).toBe('left');
    expect(out?.clockMinutes).toBe(600);
  });

  it('rejects old versions', () => {
    expect(migrate({ version: 0, player: {}, clockMinutes: 0 })).toBeNull();
  });

  it('rejects corrupt data', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('x')).toBeNull();
    expect(migrate({ version: 1 })).toBeNull();
    expect(migrate({ version: 1, player: { map: 'x', x: 'a', y: 1 }, clockMinutes: 1 })).toBeNull();
  });

  it('clamps clock and repairs facing', () => {
    const out = migrate({
      version: 1,
      player: { map: 'campus_core', x: 0, y: 0, facing: 'diagonal', name: 1 },
      clockMinutes: 9999,
    });
    expect(out?.player.facing).toBe('down');
    expect(out?.player.name).toBe('1');
    expect(out?.clockMinutes).toBe(1439);
  });
});
