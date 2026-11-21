import { describe, expect, it } from 'vitest';
import { trimMemory } from '../src/dialog/memory';
import { pickInteractable } from '../src/npc/interaction';
import { redact } from '../src/dialog/redact';
import type { ChatTurn, NpcDef, NpcRuntimeState } from '../src/types';

const turn = (n: number): ChatTurn => ({ role: n % 2 ? 'assistant' : 'user', content: String(n), at: n });

describe('trimMemory', () => {
  it('keeps the first two messages plus the tail', () => {
    const list = Array.from({ length: 40 }, (_, i) => turn(i));
    const out = trimMemory(list, 24);
    expect(out).toHaveLength(24);
    expect(out[0].content).toBe('0');
    expect(out[out.length - 1].content).toBe('39');
  });
});

const def: NpcDef = {
  id: 'n',
  name: 'NPC',
  role: 'r',
  spriteKey: 's',
  color: 0,
  persona: '',
  knowledge: [],
  greeting: [],
  fallbacks: [],
  schedule: [],
  defaultAnchor: 'a',
  wander: { radiusPx: 10, speed: 10, pauseMs: [1, 2] },
  limits: { cooldownSec: 1, maxTurns: 1, maxChars: 1 },
};

const stateAt = (x: number, y: number): NpcRuntimeState => ({
  def,
  pos: { x, y },
  facing: 'down',
  anchorId: 'a',
  zoneId: 'z',
  activity: '',
  mode: 'idle',
  cooldownUntil: 0,
  lastChatAt: 0,
});

describe('pickInteractable', () => {
  it('picks the nearest NPC in front', () => {
    const near = stateAt(100, 100);
    const far = stateAt(100, 160);
    expect(pickInteractable({ x: 100, y: 60, facing: 'down' }, [far, near], 120)).toBe(near);
  });

  it('ignores NPCs behind the player', () => {
    expect(pickInteractable({ x: 100, y: 60, facing: 'down' }, [stateAt(100, 0)], 120)).toBeNull();
  });
});

describe('redact', () => {
  it('removes keys and bearer tokens', () => {
    const s = redact('Authorization: Bearer sk-abcdef123456 failed');
    expect(s).not.toContain('abcdef123456');
    expect(s).toContain('***');
  });
});
