import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MEMORY_KEY } from '../src/config';
import { clearAllMemory, getMemory, loadMemory, pushTurn, trimMemory } from '../src/dialog/memory';
import { ClockSystem } from '../src/systems/ClockSystem';

/** 简易 localStorage 桩：让 memory 持久化逻辑能在 node 环境单测。 */
function installStorage() {
  const store = new Map<string, string>();
  const stub = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal('localStorage', stub);
  return stub;
}

describe('对话记忆持久化', () => {
  beforeEach(() => {
    installStorage();
    clearAllMemory();
  });

  it('pushTurn 写入 localStorage，loadMemory 可恢复', () => {
    pushTurn('npc_a', { role: 'user', content: '你好', at: 1 });
    pushTurn('npc_a', { role: 'assistant', content: '同学你好', at: 2 });

    const raw = localStorage.getItem(MEMORY_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).npc_a).toHaveLength(2);

    // 模拟刷新：loadMemory 会先清空内存、再从 localStorage 重建
    loadMemory();
    expect(getMemory('npc_a')).toHaveLength(2);
    expect(getMemory('npc_a')[1].content).toBe('同学你好');
  });

  it('loadMemory 每人最多恢复 24 条且过滤损坏条目', () => {
    const good = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}`, at: i }));
    localStorage.setItem(MEMORY_KEY, JSON.stringify({
      npc_b: [...good, { role: 'user', content: 123 }, null],
    }));
    loadMemory();
    const turns = getMemory('npc_b');
    expect(turns).toHaveLength(24);
    expect(turns.every((t) => typeof t.content === 'string')).toBe(true);
  });

  it('loadMemory 遇到损坏 JSON 不抛错', () => {
    localStorage.setItem(MEMORY_KEY, '{ not json');
    expect(() => loadMemory()).not.toThrow();
    expect(getMemory('anything')).toHaveLength(0);
  });

  it('trimMemory 超长时保留首两条 + 尾部', () => {
    const turns = Array.from({ length: 40 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: String(i), at: i }));
    const out = trimMemory(turns, 12);
    expect(out).toHaveLength(12);
    expect(out[0].content).toBe('0');
    expect(out[1].content).toBe('1');
    expect(out[out.length - 1].content).toBe('39');
  });
});

describe('时钟倍率', () => {
  it('1× 时 1 秒 = 1 游戏分钟', () => {
    const c = new ClockSystem(8 * 60);
    c.update(1000);
    expect(c.value).toBe(8 * 60 + 1);
  });

  it('2× 时 1 秒 = 2 游戏分钟，0.5× 时 = 0.5 分钟', () => {
    const fast = new ClockSystem(480);
    fast.speed = 2;
    fast.update(1000);
    expect(fast.value).toBe(482);

    const slow = new ClockSystem(480);
    slow.speed = 0.5;
    slow.update(1000);
    expect(slow.value).toBe(480.5);
  });
});
