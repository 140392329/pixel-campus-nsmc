import { describe, expect, it } from 'vitest';
import { parseTime, resolveNpcState } from '../src/npc/schedule';
import type { NpcDef } from '../src/types';

const npc: NpcDef = {
  id: 't',
  name: '测试',
  role: '老师',
  spriteKey: 'x',
  color: 0,
  persona: '',
  knowledge: [],
  greeting: [],
  fallbacks: [],
  schedule: [
    { from: '08:00', to: '11:30', anchorId: 'a.morning', zoneId: 'z.morning', activity: '上课' },
    { from: '11:30', to: '13:30', anchorId: 'a.noon', zoneId: 'z.noon', activity: '吃饭' },
    { from: '22:00', to: '06:00', anchorId: 'a.night', zoneId: 'z.night', activity: '巡夜' },
  ],
  defaultAnchor: 'a.default',
  wander: { radiusPx: 50, speed: 30, pauseMs: [1000, 2000] },
  limits: { cooldownSec: 5, maxTurns: 12, maxChars: 80 },
};

describe('parseTime', () => {
  it('parses valid times', () => {
    expect(parseTime('08:00')).toBe(480);
    expect(parseTime('23:59')).toBe(1439);
  });

  it('rejects invalid times', () => {
    expect(parseTime('24:00')).toBe(-1);
    expect(parseTime('8')).toBe(-1);
    expect(parseTime('08:60')).toBe(-1);
  });
});

describe('resolveNpcState', () => {
  it('resolves a morning slot', () => {
    expect(resolveNpcState(npc, 9 * 60)).toEqual({
      anchorId: 'a.morning',
      zoneId: 'z.morning',
      activity: '上课',
    });
  });

  it('handles boundaries as [from, to)', () => {
    expect(resolveNpcState(npc, 11 * 60 + 30).anchorId).toBe('a.noon');
  });

  it('handles slots crossing midnight', () => {
    expect(resolveNpcState(npc, 23 * 60).anchorId).toBe('a.night');
    expect(resolveNpcState(npc, 2 * 60).anchorId).toBe('a.night');
    expect(resolveNpcState(npc, 6 * 60).anchorId).toBe('a.default');
  });

  it('falls back to default anchor when nothing matches', () => {
    const res = resolveNpcState(npc, 15 * 60);
    expect(res.anchorId).toBe('a.default');
    expect(res.activity).toBe('休息');
  });
});
